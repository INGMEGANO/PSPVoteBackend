import { Router } from 'express';
import controller from './puestodevotacion.controller.js';

const router = Router();

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findOne);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
