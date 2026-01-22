import prisma from "../../prisma.js"

/**
 * CREAR VOTACIÓN
 */
export const createVotacion = async (req, res) => {
  try {
    const { role, leaderId: tokenLeaderId, userId } = req.user;
    let leaderIdFinal = tokenLeaderId;

    if (role === "LIDER" && !leaderIdFinal) {
      const userFromDb = await prisma.user.findUnique({
        where: { id: userId }
      });
      leaderIdFinal = userFromDb.leaderId;
    }

    if (role === "LIDER" && !leaderIdFinal) {
      return res.status(403).json({ error: "Líder sin asignación" });
    }

    if (role === "ADMIN" && !leaderIdFinal && !req.body.leaderId) {
      return res.status(400).json({ error: "Admin debe indicar leaderId" });
    }

    leaderIdFinal = role === "ADMIN" ? req.body.leaderId : leaderIdFinal;

    // 🔍 BUSCAR SI YA EXISTE ESA CÉDULA
    const existing = await prisma.votacion.findFirst({
      where: {
        cedula: req.body.cedula
      }
    });

    const votacion = await prisma.votacion.create({
      data: {
        nombre1: req.body.nombre1,
        nombre2: req.body.nombre2,
        apellido1: req.body.apellido1,
        apellido2: req.body.apellido2,
        cedula: req.body.cedula,
        telefono: req.body.telefono,
        direccion: req.body.direccion,
        barrio: req.body.barrio,
        puestoVotacion: req.body.puestoVotacion,
        leaderId: leaderIdFinal,
        recommendedById: req.body.recommendedById || null,
        programaId: req.body.programaId || null,
        sedeId: req.body.sedeId || null,
        tipoId: req.body.tipoId || null,
        esPago: req.body.esPago || null,

        // 🧠 DUPLICADOS
        isDuplicate: !!existing,
        duplicatedFrom: existing ? existing.id : null
      }
    });

    res.status(201).json({
      votacion,
      warning: existing
        ? "Este votante ya fue registrado por otro líder"
        : null
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



export const getVotaciones = async (req, res) => {
  try {
    let where = {}

    if (req.user.role === "LIDER") {
      if (!req.user.leaderId) {
        return res.status(403).json({ error: "Líder sin asignación" })
      }

      where = { leaderId: req.user.leaderId }
    }

    // ADMIN => where queda {}
    const data = await prisma.votacion.findMany({
      where,
      include: { leader: true },
      orderBy: { createdAt: "asc" }
    })

    const result = data.map((item, index) => ({
      idnumber: index + 1,
      id: item.id,
      ...item
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


export const getVotacionById = async (req, res) => {
  const { id } = req.params

  const votacion = await prisma.votacion.findUnique({
    where: { id }
  })

  if (!votacion) {
    return res.status(404).json({ error: "No encontrada" })
  }

  //console.log("ROLE:", req.user.role)
  //console.log("USER leaderId:", req.user.leaderId)
  //console.log("VOTACION leaderId:", votacion.leaderId)
  // Si NO es ADMIN y además NO es el líder dueño → bloquear
  if (
    req.user.role !== "ADMIN" &&
    req.user.role === "LIDER" &&
    votacion.leaderId !== req.user.leaderId
  ) {
    return res.status(403).json({ error: "No autorizado" })
  }

  res.json(votacion)
}



export const updateVotacion = async (req, res) => {
  const { id } = req.params;

  const oldData = await prisma.votacion.findUnique({ where: { id } });
  if (!oldData) return res.status(404).json({ error: "No encontrada" });

  // 🔹 Traer el leaderId real del usuario
  const userFromDb = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });
  const userLeaderId = userFromDb.leaderId;

  // 🔹 Validación de permisos
  if (req.user.role !== "ADMIN" && oldData.leaderId !== userLeaderId) {
    return res.status(403).json({ error: "No autorizado" });
  }

  // 🔹 Actualizar votación
  const updated = await prisma.votacion.update({
    where: { id },
    data: req.body
  });

  // 🔹 Registrar auditoría
  await prisma.audit.create({
    data: {
      tableName: "votaciones",
      recordId: id,
      oldValues: oldData,
      newValues: updated,
      modifiedBy: req.user.userId
    }
  });

  res.json(updated);
};

export const deleteVotacion = async (req, res) => {
  const { id } = req.params

  await prisma.votacion.delete({ where: { id } })

  res.json({ message: "Votación eliminada" })
}

export const getDuplicatedVotaciones = async (req, res) => {
  try {
    const where =
      req.user.role === "ADMIN"
        ? { isDuplicate: true }
        : {
            isDuplicate: true,
            leaderId: req.user.leaderId
          };

    const data = await prisma.votacion.findMany({
      where,
      include: {
        leader: true,
        duplicateOf: true
      },
      orderBy: { createdAt: "asc" }
    });

    const result = data.map((item, index) => ({
      idnumber: index + 1,
      id: item.id,
      ...item
    }))

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ⛔ Desactivar votación (soft delete)
export const deactivateVotacion = async (req, res) => {
  const { id } = req.params

  const votacion = await prisma.votacion.findUnique({ where: { id } })
  if (!votacion) {
    return res.status(404).json({ error: "No encontrada" })
  }

  if (
    req.user.role !== "ADMIN" &&
    votacion.leaderId !== req.user.leaderId
  ) {
    return res.status(403).json({ error: "No autorizado" })
  }

  const updated = await prisma.votacion.update({
    where: { id },
    data: { isActive: false }
  })

  res.json(updated)
}


// 🔁 Reasignar votación a otro líder (solo ADMIN)
export const reassignVotacion = async (req, res) => {
  const { id } = req.params
  const { newLeaderId } = req.body

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Solo admin puede reasignar" })
  }

  const votacion = await prisma.votacion.findUnique({ where: { id } })
  if (!votacion) {
    return res.status(404).json({ error: "No encontrada" })
  }

  const updated = await prisma.votacion.update({
    where: { id },
    data: {
      leaderId: newLeaderId,
      isDuplicate: false,
      duplicatedFrom: null
    }
  })

  res.json(updated)
}

// 🔎 Obtener duplicados de una votación base
export const getVotacionDuplicates = async (req, res) => {
  try {
    const { id } = req.params

    const votacion = await prisma.votacion.findUnique({
      where: { id },
      include: {
        duplicates: {
          include: {
            leader: true
          }
        }
      }
    })

    if (!votacion) {
      return res.status(404).json({ error: "No encontrada" })
    }

    res.json(votacion)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
