import express from "express"
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  toggleRoleStatus
} from "./roles.controller.js"

const router = express.Router()

router.post("/", createRole)                   // Crear rol
router.get("/", getRoles)                      // Listar roles
router.get("/:id", getRoleById)               // Obtener rol por ID
router.put("/:id", updateRole)                // Actualizar rol
router.patch("/:id/toggle-status", toggleRoleStatus) // Activar/desactivar

export default router
