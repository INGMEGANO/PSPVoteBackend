import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { allowRoles } from "../../middlewares/role.middleware.js"
import {
  createVotacion,
  getVotaciones,
  getVotacionById,
  updateVotacion,
  deleteVotacion,
  getDuplicatedVotaciones,
  getVotacionDuplicates,
  deactivateVotacion,
  reassignVotacion,
  toggleVotacionStatus
} from "./votaciones.controller.js"

const router = Router()

router.use(authMiddleware)

/* =======================
   CREAR
======================= */
router.post(
  "/",
  allowRoles("ADMIN", "LIDER", "DIGITADOR"),
  createVotacion
)

/* =======================
   LISTADOS ESPECIALES
   ⚠️ SIEMPRE ANTES DE /:id
======================= */

// 🔁 Todas las duplicadas
router.get(
  "/duplicadas",
  allowRoles("ADMIN", "LIDER"),
  getDuplicatedVotaciones
)

// 🔎 Duplicados de una votación específica
router.get(
  "/:id/duplicados",
  allowRoles("ADMIN", "LIDER"),
  getVotacionDuplicates
)

/* =======================
   LISTAR NORMAL
======================= */
router.get(
  "/",
  allowRoles("ADMIN", "LIDER"),
  getVotaciones
)

/* =======================
   CRUD POR ID
======================= */

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

// Desactivar (soft delete)
router.patch(
  "/:id/desactivar",
  allowRoles("ADMIN", "LIDER"),
  deactivateVotacion
)

router.patch(
  "/:id/toggle-status",
  allowRoles("ADMIN", "LIDER"),
  toggleVotacionStatus
)

// Reasignar a otro líder
router.patch(
  "/:id/reasignar",
  allowRoles("ADMIN"),
  reassignVotacion
)

// Eliminar físico (opcional)
router.delete(
  "/:id",
  allowRoles("ADMIN"),
  deleteVotacion
)

export default router
