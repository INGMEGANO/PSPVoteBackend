import prisma from "../../prisma.js"

// ============================
// CREAR ROL
// ============================
export const createRole = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: "El nombre del rol es obligatorio" })

    const role = await prisma.role.create({
      data: { name, isActive: true }
    })

    res.status(201).json(role)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// LISTAR TODOS LOS ROLES
// ============================
export const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany()
    res.json(roles)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// OBTENER ROL POR ID
// ============================
export const getRoleById = async (req, res) => {
  const { id } = req.params
  try {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return res.status(404).json({ error: "Rol no encontrado" })
    res.json(role)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// ACTUALIZAR ROL
// ============================
export const updateRole = async (req, res) => {
  const { id } = req.params
  const { name } = req.body
  if (!name) return res.status(400).json({ error: "El nombre del rol es obligatorio" })

  try {
    const updatedRole = await prisma.role.update({
      where: { id },
      data: { name }
    })
    res.json(updatedRole)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// ============================
// ACTIVAR / DESACTIVAR ROL
// ============================
export const toggleRoleStatus = async (req, res) => {
  const { id } = req.params

  try {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return res.status(404).json({ error: "Rol no encontrado" })

    const updatedRole = await prisma.role.update({
      where: { id },
      data: { isActive: !role.isActive }
    })

    res.json({
      message: `Rol ${updatedRole.isActive ? "activado" : "desactivado"}`,
      role: updatedRole
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
