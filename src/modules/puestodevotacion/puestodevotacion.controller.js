import service from './puestodevotacion.service.js';

export default {

  async create(req, res) {
    const puesto = await service.create(req.body);
    res.status(201).json(puesto);
  },


  

  async findAll(req, res) {
    const puestos = await service.findAll(req.query);
    res.json(puestos);
  },

  async findOne(req, res) {
    const puesto = await service.findOne(req.params.id);
    if (!puesto) {
      return res.status(404).json({ message: 'Puesto no encontrado' });
    }
    res.json(puesto);
  },

  async update(req, res) {
    const puesto = await service.update(req.params.id, req.body);
    res.json(puesto);
  },

  async remove(req, res) {
    await service.remove(req.params.id);
    res.json({ message: 'Puesto eliminado correctamente' });
  }

};
