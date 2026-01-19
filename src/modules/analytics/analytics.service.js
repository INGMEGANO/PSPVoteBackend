import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default {

  // 🔹 Usuarios por rol
  async getRolesChart() {
    const roles = await prisma.role.findMany({ include: { users: true } });
    const totalUsers = roles.reduce((acc, r) => acc + r.users.length, 0);

    return roles.map(r => ({
      name: r.name,
      count: r.users.length,
      percentage: totalUsers ? Number((r.users.length / totalUsers * 100).toFixed(2)) : 0
    }));
  },

  // 🔹 Votaciones por líder
  async getLeadersChart() {
    const leaders = await prisma.leader.findMany({ include: { votaciones: true } });
    const totalVotaciones = leaders.reduce((acc, l) => acc + l.votaciones.length, 0);

    return leaders.map(l => ({
      name: l.name,
      count: l.votaciones.length,
      percentage: totalVotaciones ? Number((l.votaciones.length / totalVotaciones * 100).toFixed(2)) : 0
    }));
  },

  // 🔹 Votantes por puesto de votación
  async getPuestosChart() {
    const puestos = await prisma.puestoVotacion.findMany();
    const totalVotantes = puestos.reduce((acc, p) => acc + p.total, 0);

    return puestos.map(p => ({
      puesto: p.puesto,
      count: p.total,
      percentage: totalVotantes ? Number((p.total / totalVotantes * 100).toFixed(2)) : 0
    }));
  },

  // 🔹 Votaciones por fecha
  async getVotacionesTimeChart() {
    const votaciones = await prisma.votacion.findMany();
    const grouped = {};

    votaciones.forEach(v => {
      const date = v.createdAt.toISOString().split("T")[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    const total = votaciones.length;

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
      percentage: total ? Number((count / total * 100).toFixed(2)) : 0
    }));
  },

  // 🔹 Distribución por género usando PuestoVotacion.mujeres/hombres
  async getGeneroChart() {
    const puestos = await prisma.puestoVotacion.findMany();
    const totalMujeres = puestos.reduce((acc, p) => acc + p.mujeres, 0);
    const totalHombres = puestos.reduce((acc, p) => acc + p.hombres, 0);
    const total = totalMujeres + totalHombres;

    return [
      { gender: "Mujeres", count: totalMujeres, percentage: total ? Number((totalMujeres / total * 100).toFixed(2)) : 0 },
      { gender: "Hombres", count: totalHombres, percentage: total ? Number((totalHombres / total * 100).toFixed(2)) : 0 },
    ];
  }

};
