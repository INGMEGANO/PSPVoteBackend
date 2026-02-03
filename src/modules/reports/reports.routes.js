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
  exportZipPorLider,
  exportExcelPorLider,
  exportPdfPorPuesto,
  exportZipPorPuesto,
  exportExcelPorPuesto,
  exportPdfPorPrograma,
  exportZipPorPrograma,
  exportExcelPorPrograma,
  exportPdfGeneral,
  exportZipGeneral,
  exportExcelGeneral,
  exportPdfCedulas,
  exportZipCedulas,
  exportExcelCedulas,
  exportPdfCedulasDuplicadasAuditoria,
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
router.get("/dashboard/exportzippdf", exportZipPorLider);
router.get("/dashboard/exportexcel", exportExcelPorLider); 
router.get("/dashboard/exportzippdf", exportZipPorLider);

router.get("/dashboard/exportpdfporpuesto", exportPdfPorPuesto);
router.get("/dashboard/exportzippdfporpuesto", exportZipPorPuesto); 
router.get("/dashboard/exportexcelporpuesto", exportExcelPorPuesto); 

router.get("/dashboard/exportpdfporprograma", exportPdfPorPrograma);
router.get("/dashboard/exportzippdfporprograma", exportZipPorPrograma); 
router.get("/dashboard/exportexcelporprograma", exportExcelPorPrograma); 

router.get("/dashboard/exportpdfgeneral", exportPdfGeneral);
router.get("/dashboard/exportzippdfgeneral", exportZipGeneral); 
router.get("/dashboard/exportexcelgeneral", exportExcelGeneral); 

router.get("/dashboard/exportpdfcedulas", exportPdfCedulas);
router.get("/dashboard/exportzippdfcedulas", exportZipCedulas); 
router.get("/dashboard/exportexcelcedulas", exportExcelCedulas); 

router.get("/dashboard/exportpdfcedulasduplicadas", exportPdfCedulasDuplicadasAuditoria);


router.get("/dashboard/previewpdf", previewPorLider);

export default router
