import { Router } from "express"
import { getProgramas, getSedesByPrograma, obtenerOpcionesPrograma  } from "./programa.controller.js"

const router = Router()

router.get("/", getProgramas)
router.get("/:programaId/sedes", getSedesByPrograma)
router.get("/opciones", obtenerOpcionesPrograma)


export default router
