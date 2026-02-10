import express from "express";
import multer from "multer";
import { validarCedulasExcel } from "./ExcelValidationController.js";

const router = express.Router();
const upload = multer(); // memoria

router.post(
  "/excel/validar-cedulas",
  upload.single("file"),
  validarCedulasExcel
);

export default router;
