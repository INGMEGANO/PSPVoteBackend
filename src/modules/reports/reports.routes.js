import express from "express"
import {
  dashboard,
  porLider,
  porDigitador,
  duplicados,
  pagos,
  planillas,
  dashboardDetalle,   
  dashboardResumen,
  exportDashboard,
  exportDashboardXLSX,
  exportPdfPorLider,
  previewPorLider
} from "./reports.controller.js"

import { authMiddleware } from "../../middlewares/auth.middleware.js"

const router = express.Router()

router.use(authMiddleware)

router.get("/dashboard", dashboard)
router.get("/lideres", porLider)
router.get("/digitadores", porDigitador)
router.get("/duplicados", duplicados)
router.get("/pagos", pagos)
router.get("/planillas", planillas)
router.get("/dashboard/detalle", dashboardDetalle);
router.get("/dashboard/resumen", dashboardResumen); 
router.get("/dashboard/export", exportDashboard);
router.get("/dashboard/exportxls", exportDashboardXLSX);
router.get("/dashboard/exportpdf", exportPdfPorLider);
router.get("/dashboard/previewpdf", previewPorLider);

export default router
