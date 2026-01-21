import prisma from "../../prisma.js"
import bcrypt from "bcrypt"

// ============================
// CREAR USUARIO
// ============================
export const createUser = async (req, res) => {
  try {
    const { username, password, roleId, leaderId } = req.body

    // Verificar que el rol exista
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) return res.status(400).json({ error: "Rol no existe" })

    // Hashear la contraseña
    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hash,
        roleId,
        leaderId: leaderId || null,
        isActive: true // siempre activo al crear
      },
      include: { role: true, leader: true }
    })

    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// OBTENER TODOS LOS USUARIOS
// ============================
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true, leader: true }
    })
    res.json(users)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// OBTENER USUARIO POR ID
// ============================
export const getUserById = async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, leader: true }
    })
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" })
    res.json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// ACTUALIZAR USUARIO
// ============================
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { username, password, roleId, leaderId } = req.body

  try {
    const data = { username, roleId, leaderId }

    // Actualizar password solo si viene en el body
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      include: { role: true, leader: true }
    })

    res.json(updatedUser)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// ACTIVAR / DESACTIVAR USUARIO
// ============================
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params

  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" })

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: { role: true, leader: true }
    })

    res.json({
      message: `Usuario ${updatedUser.isActive ? "activado" : "desactivado"}`,
      user: updatedUser
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
