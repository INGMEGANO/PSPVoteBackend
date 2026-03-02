import express from "express";
import multer from "multer";
import { validarCedulasExcel,importarCedulasController, getCedulasBloqueadas, toggleCedulaBloqueada } from "./ExcelValidationController.js";

const router = express.Router();
const upload = multer(); // memoria

const storage = multer.memoryStorage();

export const upload2 = multer({ storage });

router.post(
  "/excel/validar-cedulas",
  upload.single("file"),
  validarCedulasExcel
);

router.post(
  "/excel/importar-cedulas",
  upload2.single("file"),
  importarCedulasController
);


router.get("/cedulas-bloqueadas", getCedulasBloqueadas);

router.patch(
  "/cedulas-bloqueadas/:id/toggle",
  toggleCedulaBloqueada
);

export default router;
