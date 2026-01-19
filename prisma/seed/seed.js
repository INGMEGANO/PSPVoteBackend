import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  // ROLES
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" }
  })

  const liderRole = await prisma.role.upsert({
    where: { name: "LIDER" },
    update: {},
    create: { name: "LIDER" }
  })

  const digitadorRole = await prisma.role.upsert({
    where: { name: "DIGITADOR" },
    update: {},
    create: { name: "DIGITADOR" }
  })

  // ADMIN
  const password = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password,
      roleId: adminRole.id
    }
  })

  console.log("✅ Roles y ADMIN creados")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
