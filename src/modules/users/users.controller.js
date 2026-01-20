import prisma from "../../prisma.js"
import bcrypt from "bcrypt"

export const createUser = async (req, res) => {
  try {
    const { username, password, roleId, leaderId } = req.body

    const role = await prisma.role.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      return res.status(400).json({ error: "Rol no existe" })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hash,
        roleId,
        leaderId: leaderId || null
      }
    })

    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const getUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true, leader: true }
  })
  res.json(users)
}
