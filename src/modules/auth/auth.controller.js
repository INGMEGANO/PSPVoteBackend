import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import prisma from "../../prisma.js"

export const login = async (req, res) => {
  const { username, password } = req.body

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true }
  })

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Credenciales inválidas" })
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role.name,
      leaderId: user.leaderId
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  )

  res.json({ token })
}
