import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generarCodigo4Digitos() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function migrar() {
  try {
    console.log("🚀 Iniciando migración...");

    const leaders = await prisma.leader.findMany({
      where: { isActive: true }
    });

    for (const leader of leaders) {
      let codigo;
      let existe = true;

      while (existe) {
        codigo = generarCodigo4Digitos();

        const yaExiste = await prisma.leaderExt.findUnique({
          where: { codigoReferencia: codigo }
        });

        if (!yaExiste) existe = false;
      }

      await prisma.leaderExt.create({
        data: {
          id: leader.id, // 👈 mismo ID
          name: leader.name,
          phone: leader.phone,
          address: leader.address,
          codigoReferencia: codigo
        }
      });

      console.log(`✅ Migrado: ${leader.name} - ID: ${leader.id} - Código: ${codigo}`);
    }

    console.log("🎉 Migración finalizada");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error en migración:", error);
    process.exit(1);
  }
}

migrar();