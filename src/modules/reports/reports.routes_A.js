import express from "express"
import {
  exportPdfCedulasDuplicadasAuditoria
} from "./reports.controller_A.js"

import { authMiddleware } from "../../middlewares/auth.middleware.js"

const router = express.Router()

router.use(authMiddleware)



router.get("/dashboard/exportpdfcedulasduplicadas", exportPdfCedulasDuplicadasAuditoria);


 



export default router
