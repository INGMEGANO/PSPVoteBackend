import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed...")

  // ============================
  // CREAR ROLES
  // ============================
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", isActive: true }
  })

  const liderRole = await prisma.role.upsert({
    where: { name: "LIDER" },
    update: {},
    create: { name: "LIDER", isActive: true }
  })

  const digitadorRole = await prisma.role.upsert({
    where: { name: "DIGITADOR" },
    update: {},
    create: { name: "DIGITADOR", isActive: true }
  })

  console.log("✅ Roles creados o ya existentes")

  // ============================
  // CREAR ADMIN
  // ============================
  const adminPassword = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {}, // no actualizar si ya existe
    create: {
      username: "admin",
      password: adminPassword,
      roleId: adminRole.id,
      isActive: true
    }
  })

  console.log("✅ Usuario ADMIN creado o ya existente")

  // ============================
  // CREAR USUARIOS DE PRUEBA
  // ============================
  const testPassword = await bcrypt.hash("test123", 10)

  const testUsers = [
    { username: "lider1", roleId: liderRole.id },
    { username: "digitador1", roleId: digitadorRole.id }
  ]

  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        password: testPassword,
        roleId: u.roleId,
        isActive: true
      }
    })
  }

  console.log("✅ Usuarios de prueba creados o ya existentes")
  console.log("🌱 Seed finalizado")
}

main()
  .catch(err => {
    console.error("❌ Error en seed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
