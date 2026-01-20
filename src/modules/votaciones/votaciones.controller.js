import prisma from "../../prisma.js"

/**
 * CREAR VOTACIÓN
 */
export const createVotacion = async (req, res) => {
  try {
    const { role, leaderId } = req.user

    // 🔐 Solo líderes pueden crear votaciones
    if (role === "LIDER" && !leaderId) {
      return res.status(403).json({
        error: "El usuario líder no tiene un líder asociado"
      })
    }

    // 👑 ADMIN puede crear SOLO si indica líder
    if (role === "ADMIN" && !leaderId && !req.body.leaderId) {
      return res.status(400).json({
        error: "Admin debe indicar leaderId"
      })
    }

    const finalLeaderId =
      role === "ADMIN" ? req.body.leaderId : leaderId

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
        leaderId: finalLeaderId
      }
    })

    res.status(201).json(votacion)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}


export const getVotaciones = async (req, res) => {
  try {
    const where =
      req.user.role === "ADMIN"
        ? {}
        : { leaderId: req.user.leaderId }

    const data = await prisma.votacion.findMany({
      where,
      include: { leader: true }
    })

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const getVotacionById = async (req, res) => {
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

  res.json(votacion)
}


export const updateVotacion = async (req, res) => {
  const { id } = req.params

  const oldData = await prisma.votacion.findUnique({ where: { id } })
  if (!oldData) return res.status(404).json({ error: "No encontrada" })

  if (
    req.user.role !== "ADMIN" &&
    oldData.leaderId !== req.user.leaderId
  ) {
    return res.status(403).json({ error: "No autorizado" })
  }

  const updated = await prisma.votacion.update({
    where: { id },
    data: req.body
  })

  await prisma.audit.create({
    data: {
      tableName: "votaciones",
      recordId: id,
      oldValues: oldData,
      newValues: updated,
      modifiedBy: req.user.userId
    }
  })

  res.json(updated)
}

export const deleteVotacion = async (req, res) => {
  const { id } = req.params

  await prisma.votacion.delete({ where: { id } })

  res.json({ message: "Votación eliminada" })
}
