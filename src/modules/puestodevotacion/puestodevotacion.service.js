import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default {

  async create(data) {
    const total = Number(data.mujeres) + Number(data.hombres);

    return prisma.puestoVotacion.create({
      data: { ...data, total }
    });
  },

  async findAll(filters) {
    return prisma.puestoVotacion.findMany({
      where: {
        municipio: filters.municipio,
        comuna: filters.comuna ? Number(filters.comuna) : undefined
      }
    });
  },

  async findOne(id) {
    return prisma.puestoVotacion.findUnique({
      where: { id: Number(id) }
    });
  },

  async update(id, data) {
    const puesto = await this.findOne(id);
    if (!puesto) throw new Error('No existe');

    const mujeres = data.mujeres ?? puesto.mujeres;
    const hombres = data.hombres ?? puesto.hombres;

    return prisma.puestoVotacion.update({
      where: { id: Number(id) },
      data: {
        ...data,
        mujeres,
        hombres,
        total: Number(mujeres) + Number(hombres)
      }
    });
  },

  async remove(id) {
    return prisma.puestoVotacion.delete({
      where: { id: Number(id) }
    });
  }

};
