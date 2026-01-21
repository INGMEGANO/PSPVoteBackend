import prisma from "../../prisma.js"

// ========================
// CREAR LÍDER (y asociar usuario opcional)
// ========================
export const createLeader = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        error: "Body vacío o no enviado. Usa Content-Type: application/json"
      })
    }

    const { userId, name, phone, address, recommendedById } = req.body || {}

    if (!name) {
      return res.status(400).json({ error: "El campo 'name' es obligatorio" })
    }

    // Validar recomendador si viene
    if (recommendedById) {
      const exists = await prisma.leader.findUnique({ where: { id: recommendedById } })
      if (!exists) return res.status(400).json({ error: "El líder recomendador no existe" })
    }

    // Crear líder con isActive: true
    const leader = await prisma.leader.create({
      data: {
        name,
        phone,
        address,
        recommendedById: recommendedById || null,
        isActive: true
      }
    })

    // Asociar usuario al líder si se envió userId
    let user = null
    if (userId) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { leaderId: leader.id }
      })
    }

    res.status(201).json({ leader, user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ========================
// LISTAR LÍDERES
// ========================
export const getLeaders = async (req, res) => {
  const leaders = await prisma.leader.findMany({
    include: { recommendedBy: true, recommendations: true, users: true },
    orderBy: { createdAt: "desc" }
  })
  res.json(leaders)
}

// ========================
// OBTENER LÍDER POR ID
// ========================
export const getLeaderById = async (req, res) => {
  const leader = await prisma.leader.findUnique({
    where: { id: req.params.id },
    include: { recommendedBy: true, recommendations: true, users: true, votaciones: true }
  })

  if (!leader) return res.status(404).json({ error: "Líder no encontrado" })

  res.json(leader)
}

// ========================
// ACTUALIZAR LÍDER
// ========================
export const updateLeader = async (req, res) => {
  try {
    const { name, phone, address, recommendedById } = req.body

    if (recommendedById) {
      const exists = await prisma.leader.findUnique({ where: { id: recommendedById } })
      if (!exists) return res.status(400).json({ error: "El líder recomendador no existe" })
    }

    const leader = await prisma.leader.update({
      where: { id: req.params.id },
      data: { name, phone, address, recommendedById: recommendedById || null }
    })

    res.json(leader)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ========================
// ACTIVAR / DESACTIVAR LÍDER
// ========================
export const toggleLeaderStatus = async (req, res) => {
  const { id } = req.params

  try {
    const leader = await prisma.leader.findUnique({ where: { id } })
    if (!leader) return res.status(404).json({ error: "Líder no encontrado" })

    const updatedLeader = await prisma.leader.update({
      where: { id },
      data: { isActive: !leader.isActive }
    })

    res.json({
      message: `Líder ${updatedLeader.isActive ? "activado" : "desactivado"}`,
      leader: updatedLeader
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ========================
// ASIGNAR USUARIO A LÍDER
// ========================
export const assignUserToLeader = async (req, res) => {
  const { userId, leaderId } = req.body
  if (!userId || !leaderId) return res.status(400).json({ error: "userId y leaderId son obligatorios" })

  const leader = await prisma.leader.findUnique({ where: { id: leaderId } })
  if (!leader) return res.status(404).json({ error: "Líder no encontrado" })

  const user = await prisma.user.update({ where: { id: userId }, data: { leaderId } })

  res.json({ message: "Usuario asignado al líder correctamente", user })
}
