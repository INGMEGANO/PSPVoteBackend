import express from "express"
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus
} from "./users.controller.js"

const router = express.Router()

router.post("/", createUser) // Crear usuario
router.get("/", getUsers) // Listar todos los usuarios
router.get("/:id", getUserById) // Obtener usuario por ID
router.put("/:id", updateUser) // Actualizar usuario
router.patch("/:id/toggle-status", toggleUserStatus) // Activar/desactivar

export default router
