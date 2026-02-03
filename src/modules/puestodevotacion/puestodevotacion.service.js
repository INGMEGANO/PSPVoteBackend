import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export default {

  async create(data) {
    return prisma.puestoVotacion.create({
      data
    });
  },

  async findAll(query) {

  const puestos = await prisma.puestoVotacion.findMany({
    orderBy: { puesto: 'asc' }
  });

  const conteo = await prisma.votacion.groupBy({
    by: ['puestoVotacion'],
    _count: { _all: true },
    where: {
      puestoVotacion: { not: null },
      isActive: true
    }
  });

  const mapa = {};
  let totalVotacionesSistema = 0;

  conteo.forEach(c => {
    mapa[c.puestoVotacion] = c._count._all;
    totalVotacionesSistema += c._count._all;
  });

  // 🔥 TOTAL ELECTORAL REAL
  const totalElectoral = puestos.reduce(
    (acc, p) => acc + (p.total || 0),
    0
  );

  return puestos.map(p => {
    const totalVotaciones = mapa[p.id] || 0;

    return {
      ...p,
      totalVotaciones,

      // 1️⃣ Ranking interno
      porcentajeSobreVotaciones: totalVotacionesSistema > 0
        ? Number(((totalVotaciones / totalVotacionesSistema) * 100).toFixed(2))
        : 0,

      // 2️⃣ General REAL (el que buscas)
      porcentajeGeneralReal: totalElectoral > 0
        ? Number(((totalVotaciones / totalElectoral) * 100).toFixed(4))
        : 0,

      // 3️⃣ Progreso local
      porcentajePuesto: p.total > 0
        ? Number(((totalVotaciones / p.total) * 100).toFixed(4))
        : 0
    };
  });
  },

  async findOne(id) {
    return prisma.puestoVotacion.findUnique({
      where: { id }
    });
  },

  async update(id, data) {
    return prisma.puestoVotacion.update({
      where: { id },
      data
    });
  },

  async remove(id) {
    return prisma.puestoVotacion.delete({
      where: { id }
    });
  }

};

