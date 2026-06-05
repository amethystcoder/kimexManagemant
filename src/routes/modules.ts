import { Router } from 'express';
import { getModules } from '../controllers/modules';

const router = Router();

router.get('/', getModules);

export default router;
