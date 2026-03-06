import { Router } from "express";
import {
  getVotacionExterno,
  confirmarVotoExterno,
  listarConfirmacionesExternas,
  confirmarVotoCedCodLidExterno,
  exportPdfConfirmacionesExternas
} from "./externo.controller.js";

import multer from "multer";
import path from "path";
import crypto from "crypto";


const router = Router();

// 🔓 SIN TOKEN
router.get("/votacion/:cedula", getVotacionExterno);

router.post(
  '/confirmar-cedula-lider-externo',
  confirmarVotoCedCodLidExterno
);

router.post("/confirmar", confirmarVotoExterno);


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/votos");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // 👈 ahora sí funciona
    const nombre = crypto.randomBytes(16).toString("hex");
    cb(null, nombre + ext);
  }
});

export const upload = multer({ storage });

router.post(
  "/confirmar-voto-externo",
  upload.array("imagenes", 5),
  confirmarVotoExterno
);

router.get('/confirmaciones-externas', listarConfirmacionesExternas);


router.get(
  "/confirmaciones-externas/pdf",
  exportPdfConfirmacionesExternas
);



export default router;