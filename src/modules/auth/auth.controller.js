import prisma from "../../prisma.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

export const login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: "Username y password son obligatorios" })
    }

    // Buscar usuario por username
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        leader: true, // Incluye el líder al que pertenece
        role: true // Incluimos toda la relación Role

      }
    })

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" })

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ error: "Password incorrecto" })

    // Generar token
    const token = jwt.sign(
      { userId: user.id, role: user.role.name, leaderId: user.leaderId },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    )

    // Eliminar password del objeto antes de enviar
    const { password: _, ...userData } = user

    // Enviar user con role garantizado
    res.json({
      token,
      user: {
        ...userData,
        role: user.role // ✅ Aseguramos que siempre venga
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
