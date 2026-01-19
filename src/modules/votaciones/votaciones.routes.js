import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { allowRoles } from "../../middlewares/role.middleware.js"
import {
  createVotacion,
  getVotaciones,
  getVotacionById,
  updateVotacion,
  deleteVotacion
} from "./votaciones.controller.js"

const router = Router()

router.use(authMiddleware)

// Crear
router.post(
  "/",
  allowRoles("ADMIN", "LIDER", "DIGITADOR"),
  createVotacion
)

// Listar
router.get(
  "/",
  allowRoles("ADMIN", "LIDER"),
  getVotaciones
)

// Ver una
router.get(
  "/:id",
  allowRoles("ADMIN", "LIDER"),
  getVotacionById
)

// Actualizar
router.put(
  "/:id",
  allowRoles("ADMIN", "LIDER"),
  updateVotacion
)

// Eliminar
router.delete(
  "/:id",
  allowRoles("ADMIN"),
  deleteVotacion
)

export default router
