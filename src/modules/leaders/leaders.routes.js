import express from "express"
import {
  createLeader,
  getLeaders,
  getLeaderById,
  updateLeader,
  toggleLeaderStatus,
  assignUserToLeader
} from "./leaders.controller.js"

const router = express.Router()

router.post("/", createLeader)                   // Crear líder
router.get("/", getLeaders)                      // Listar líderes
router.get("/:id", getLeaderById)               // Obtener líder por ID
router.put("/:id", updateLeader)                // Actualizar líder
router.patch("/:id/toggle-status", toggleLeaderStatus) // Activar/desactivar
router.post("/assign-user", assignUserToLeader) // Asignar usuario a líder

export default router
