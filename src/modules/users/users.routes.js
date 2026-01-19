import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { allowRoles } from "../../middlewares/role.middleware.js"
import {
  createUser,
  getUsers
} from "./users.controller.js"

const router = Router()

router.use(authMiddleware)

// SOLO ADMIN
router.post("/", allowRoles("ADMIN"), createUser)
router.get("/", allowRoles("ADMIN"), getUsers)

export default router
