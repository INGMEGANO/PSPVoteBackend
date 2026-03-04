import { Router } from "express";
import {
  getVotacionExterno,
  confirmarVotoExterno
} from "./externo.controller.js";

const router = Router();

// 🔓 SIN TOKEN
router.get("/votacion/:cedula", getVotacionExterno);
router.post("/confirmar", confirmarVotoExterno);

export default router;