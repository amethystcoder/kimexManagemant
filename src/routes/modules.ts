import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getModules } from '../controllers/modules';

const router = Router();

router.get('/', requireAuth, getModules);

export default router;
