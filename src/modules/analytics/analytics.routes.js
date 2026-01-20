import { Router } from "express";
import AnalyticsController from "./analytics.controller.js";

const router = Router();

router.get("/roles", AnalyticsController.rolesChart);
router.get("/leaders", AnalyticsController.leadersChart);
router.get("/puestos", AnalyticsController.puestosChart);
router.get("/votaciones-time", AnalyticsController.votacionesTimeChart);
router.get("/genero", AnalyticsController.generoChart);

export default router;
