import express from "express"
import {
  createLeader,
  getLeaders,
  getLeaderById,
  updateLeader,
  deleteLeader
} from "./leaders.controller.js"
import { assignUserToLeader } from "./leaders.controller.js"; // ✅ Importamos la función


const router = express.Router()

router.post("/", createLeader)
router.get("/", getLeaders)
router.get("/:id", getLeaderById)
router.put("/:id", updateLeader)
router.delete("/:id", deleteLeader)

router.post("/assign-user", assignUserToLeader); // ✅ Aquí se monta correctamente


export default router
