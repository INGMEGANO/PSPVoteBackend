import express from "express"
import cors from "cors"

import authRoutes from "./modules/auth/auth.routes.js"

import usersRoutes from "./modules/users/users.routes.js"

import rolesRoutes from "./modules/roles/roles.routes.js"

import leaderRoutes from "./modules/leaders/leaders.routes.js"

import programaRoutes from "./modules/programas/programa.routes.js"

import puestoVotacionRoutes from './modules/puestodevotacion/puestodevotacion.routes.js';


import votacionesRoutes from "./modules/votaciones/votaciones.routes.js"

import analyticsRoutes from "./modules/analytics/analytics.routes.js";

import reportsRoutes from "./modules/reports/reports.routes.js"



const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)

app.use("/api/users", usersRoutes)

app.use("/api/roles", rolesRoutes)

app.use("/api/leaders", leaderRoutes)

app.use("/api/programas", programaRoutes)


app.use('/api/puestos-votacion', puestoVotacionRoutes);


app.use("/api/votaciones", votacionesRoutes)

app.use("/api/analytics", analyticsRoutes);

app.use("/api/reports", reportsRoutes)



app.get("/", (req, res) => {
  res.json({ message: "API Votaciones funcionando" })
})

export default app
