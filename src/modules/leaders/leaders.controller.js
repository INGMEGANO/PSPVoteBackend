import prisma from "../../prisma.js"

// ========================
// CREAR LÍDER
// ========================
export const createLeader = async (req, res) => {
  try {
    console.log("HEADERS:", req.headers)
    console.log("BODY:", req.body)

    if (!req.body) {
      return res.status(400).json({
        error: "Body vacío o no enviado. Usa Content-Type: application/json"
      })
    }

    const { userId, name, phone, address, recommendedById } = req.body || {}

    if (!name) {
      return res.status(400).json({
        error: "El campo 'name' es obligatorio"
      })
    }

    // Validar recomendador si viene
    if (recommendedById) {
      const exists = await prisma.leader.findUnique({
        where: { id: recommendedById }
      })

      if (!exists) {
        return res.status(400).json({ error: "El líder recomendador no existe" })
      }
    }

    // Crear líder
    const leader = await prisma.leader.create({
      data: {
        name,
        phone,
        address,
        recommendedById: recommendedById || null
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
    include: {
      recommendedBy: true,
      recommendations: true
    }
  })
  res.json(leaders)
}

// ========================
// OBTENER LÍDER POR ID
// ========================
export const getLeaderById = async (req, res) => {
  const leader = await prisma.leader.findUnique({
    where: { id: req.params.id },
    include: {
      recommendedBy: true,
      recommendations: true,
      votaciones: true
    }
  })

  if (!leader) {
    return res.status(404).json({ error: "Líder no encontrado" })
  }

  res.json(leader)
}

// ========================
// ACTUALIZAR LÍDER
// ========================
export const updateLeader = async (req, res) => {
  try {
    const { name, phone, address, recommendedById } = req.body

    if (recommendedById) {
      const exists = await prisma.leader.findUnique({
        where: { id: recommendedById }
      })

      if (!exists) {
        return res.status(400).json({ error: "El líder recomendador no existe" })
      }
    }

    const leader = await prisma.leader.update({
      where: { id: req.params.id },
      data: {
        name,
        phone,
        address,
        recommendedById: recommendedById || null
      }
    })

    res.json(leader)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ========================
// ELIMINAR LÍDER
// ========================
export const deleteLeader = async (req, res) => {
  try {
    await prisma.leader.delete({
      where: { id: req.params.id }
    })
    res.json({ message: "Líder eliminado correctamente" })
  } catch (error) {
    res.status(400).json({ error: "No se puede eliminar el líder" })
  }
}


export const assignUserToLeader = async (req, res) => {
  const { userId, leaderId } = req.body;

  if (!userId || !leaderId) {
    return res.status(400).json({ error: "userId y leaderId son obligatorios" });
  }

  // Validar que el líder existe
  const leader = await prisma.leader.findUnique({ where: { id: leaderId } });
  if (!leader) return res.status(404).json({ error: "Líder no encontrado" });

  // Actualizar el usuario
  const user = await prisma.user.update({
    where: { id: userId },
    data: { leaderId }
  });

  res.json({ message: "Usuario asignado al líder correctamente", user });
};