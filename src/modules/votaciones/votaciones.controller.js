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
console.log("REQ.USER:", req.user);
    if (req.user.role === "LIDER") {
      if (!req.user.leaderId) {
        return res.status(403).json({ error: "Líder sin asignación" })
      }

      where = {
        OR: [
          { leaderId: req.user.leaderId },  // lo que es su líder
          { digitadorId: req.user.userId }      // lo que digitó él
        ]
      }
    }

    // ADMIN => where queda {}
    const data = await prisma.votacion.findMany({
      where,
      include: { leader: true, digitador: true },
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
  const { id } = req.params;

  // 🔹 Buscar votación
  const votacion = await prisma.votacion.findUnique({
    where: { id }
  });

  if (!votacion) {
    return res.status(404).json({ error: "No encontrada" });
  }

  // 🔹 Traer el leaderId real del usuario
  const userFromDb = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });
  const userLeaderId = userFromDb.leaderId;

  // 🔹 Validación de permisos
  if (
    req.user.role !== "ADMIN" &&
    votacion.leaderId !== userLeaderId &&
    votacion.digitadorId !== req.user.userId
  ) {
    return res.status(403).json({ error: "No autorizado" });
  }

  res.json(votacion);
};

export const getVotacionByCedula = async (req, res) => {
  const { cedula } = req.params;
  const { role, userId } = req.user;

  // 🔹 ADMIN → acceso total al primer registro
  if (role === "ADMIN") {
    const votacion = await prisma.votacion.findFirst({
      where: { cedula },
      orderBy: { createdAt: "asc" }
    });

    if (!votacion) return res.status(404).json({ error: "No encontrada" });

    return res.json({
      message: "Acceso total (ADMIN)",
      votacion
    });
  }

  // 🔹 LÍDER → necesitamos su leaderId
  let leaderId = null;
  if (role === "LIDER") {
    const userFromDb = await prisma.user.findUnique({
      where: { id: userId },
      select: { leaderId: true }
    });
    leaderId = userFromDb.leaderId;
  }

  // 🔹 Buscar cualquier votación donde el usuario haya participado
  const votacionPropia = await prisma.votacion.findFirst({
    where: {
      cedula,
      OR: [
        { digitadorId: userId },
        ...(role === "LIDER" ? [{ leaderId }] : [])
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  if (votacionPropia) {
    // ⚡ Si ya la digitó él
    return res.json({
      message:
        role === "DIGITADOR"
          ? "Ya registraste esta votación"
          : "Ya registraste esta votación como líder",
      votacion: votacionPropia
    });
  }

  // 🔹 Si no la ha digitado nunca → dejarlo pasar
  return res.json({
    message: "Votación disponible para digitar",
    votacion: null
  });
};



export const getVotacionesByPlanilla = async (req, res) => {
  try {
    const { planilla } = req.params;

    const votaciones = await prisma.votacion.findMany({
      where: {
        planilla: Number(planilla)
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const result = votaciones.map((item, index) => ({
      idnumber: index + 1, // consecutivo
      ...item
    }));

    res.json({
      planilla: Number(planilla),
      total: votaciones.length,
      votaciones: result
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


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
  if (
    req.user.role !== "ADMIN" &&
    oldData.leaderId !== userLeaderId &&
    oldData.digitadorId !== req.user.userId
  ) {
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
            leader: true,
            digitador: true
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

export const toggleVotacionStatus = async (req, res) => {
  const { id } = req.params
  const { observation } = req.body
  const { role, leaderId, userId } = req.user

  const votacion = await prisma.votacion.findUnique({ where: { id } })
  if (!votacion) {
    return res.status(404).json({ error: "No encontrada" })
  }

  // Seguridad
  if (role !== "ADMIN" && votacion.leaderId !== leaderId) {
    return res.status(403).json({ error: "No autorizado" })
  }

  const newStatus = !votacion.isActive
  const action = newStatus ? "ACTIVAR" : "DESACTIVAR"

  const updated = await prisma.votacion.update({
    where: { id },
    data: { isActive: newStatus }
  })

  // Guardar historial
  await prisma.votacionStatusLog.create({
    data: {
      votacionId: id,
      userId,
      action,
      observation
    }
  })

  res.json({
    message: `Votación ${action.toLowerCase()} correctamente`,
    votacion: updated
  })
}


/**
 * CREAR VOTACIONES (CARGA MASIVA)
 * Convive con createVotacion
 */
export const createVotacionBulk = async (req, res) => {
  try {
    const votaciones = Array.isArray(req.body) ? req.body : [req.body];
    const digitadorId = req.user.userId;


    const results = [];

    // 🧾 OBTENER NÚMERO DE PLANILLA CONSECUTIVO
    const lastPlanilla = await prisma.votacion.findFirst({
      orderBy: { planilla: "desc" },
      select: { planilla: true }
    });

    const planilla = lastPlanilla ? lastPlanilla.planilla + 1 : 1;

    for (const item of votaciones) {
      const {
        nombre1,
        nombre2,
        apellido1,
        apellido2,
        cedula,
        telefono,
        direccion,
        barrio,
        puestoVotacion,
        leaderId,
        recommendedById,
        programaId,
        sedeId,
        tipoId,
        esPago
      } = item;

      if (!leaderId) {
        results.push({
          cedula,
          error: "leaderId es obligatorio"
        });
        continue;
      }

      // 🔍 DUPLICADO POR CÉDULA
      const existing = await prisma.votacion.findFirst({
        where: { cedula }
      });

      const votacion = await prisma.votacion.create({
        data: {
          nombre1,
          nombre2,
          apellido1,
          apellido2,
          cedula,
          telefono,
          direccion,
          barrio,
          puestoVotacion,
          leaderId,
          digitadorId,
          recommendedById: recommendedById || null,
          programaId: programaId || null,
          sedeId: sedeId || null,
          tipoId: tipoId || null,
          esPago: esPago ?? null,

          // 👇 NUEVO
          planilla,

          isDuplicate: !!existing,
          duplicatedFrom: existing ? existing.id : null
        }
      });

      results.push({
        cedula,
        id: votacion.id,
        planilla,
        isDuplicate: !!existing
      });
    }

    res.status(201).json({
      planilla,
      total: results.length,
      creados: results.filter(r => !r.error).length,
      errores: results.filter(r => r.error).length,
      results
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const updateVotacionBulkByPlanilla = async (req, res) => {
  try {
    const { planilla } = req.params;
    const items = Array.isArray(req.body) ? req.body : [req.body];

    const results = [];

    for (const item of items) {
      const { cedula, ...data } = item;

      if (!cedula) {
        results.push({
          error: "cedula es obligatoria",
          item
        });
        continue;
      }

      const updated = await prisma.votacion.updateMany({
        where: {
          planilla: Number(planilla),
          cedula
        },
        data
      });

      results.push({
        cedula,
        actualizados: updated.count
      });
    }

    res.json({
      planilla: Number(planilla),
      total: results.length,
      results
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
