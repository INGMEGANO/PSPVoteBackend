import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { allowRoles } from "../../middlewares/role.middleware.js"
import {
  createVotacion,
  createVotacionBulk,
  getVotaciones,
  getVotacionById,
  getVotacionByCedula,
  getVotacionesByPlanilla,
  updateVotacion,
  updateVotacionBulkByPlanilla,
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
   CREAR MASIVO (BULK)
======================= */
router.post(
  "/bulk",
  allowRoles("ADMIN", "LIDER", "DIGITADOR"),
  createVotacionBulk
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

router.get(
  "/planilla/:planilla",
  allowRoles("ADMIN", "LIDER"),
  getVotacionesByPlanilla
);

/* =======================
   CRUD POR ID
======================= */

// Ver una
router.get(
  "/:id",
  allowRoles("ADMIN", "LIDER"),
  getVotacionById
)

router.get(
  "/cedula/:cedula",
  allowRoles("ADMIN", "LIDER", "DIGITADOR"),
  getVotacionByCedula
);

// Actualizar
router.put(
  "/:id",
  allowRoles("ADMIN", "LIDER"),
  updateVotacion
)

/* =======================
   ACTUALIZAR POR PLANILLA
======================= */
router.patch(
  "/planilla/:planilla/bulk",
  allowRoles("ADMIN", "LIDER"),
  updateVotacionBulkByPlanilla
);



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
