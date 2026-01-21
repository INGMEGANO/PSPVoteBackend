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
    update: {},
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

  // ============================
// PROGRAMAS
// ============================
const programas = [
  { nombre: "P/P", tieneSedes: false },
  { nombre: "COMPROMISOS", tieneSedes: false },
  { nombre: "LIDERES", tieneSedes: false },
  { nombre: "COLEGIOS", tieneSedes: true },
  { nombre: "OTRO1", tieneSedes: false },
  { nombre: "OTRO2", tieneSedes: false },
  { nombre: "OTRO3", tieneSedes: false },
]

for (const p of programas) {
  await prisma.programa.upsert({
    where: { nombre: p.nombre },
    update: { tieneSedes: p.tieneSedes },
    create: p
  })
}

console.log("✅ Programas creados")

// ============================
// TIPOS DE VINCULACIÓN
// ============================
const tipos = ["P/P", "CORAZÓN"]

for (const nombre of tipos) {
  await prisma.tipoVinculacion.upsert({
    where: { nombre },
    update: {},
    create: { nombre }
  })
}

console.log("✅ Tipos de vinculación creados")

// ============================
// SEDES
// ============================
const salud = await prisma.programa.findUnique({
  where: { nombre: "COLEGIOS" }
})

if (salud) {
  const sedesSalud = ["VILLADELA", "MANUELA", "7 BOCAS", 'ROBLES', 'GALAN', 'C BONITA']

  for (const nombre of sedesSalud) {
    await prisma.sedePrograma.upsert({
      where: {
        nombre_programaId: {
          nombre,
          programaId: salud.id
        }
      },
      update: {},
      create: {
        nombre,
        programaId: salud.id
      }
    })
  }
}

console.log("✅ Sedes creadas")

  console.log("🌱 Seed finalizado correctamente")
}

main()
  .catch(err => {
    console.error("❌ Error en seed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
