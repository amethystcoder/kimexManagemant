import { Router } from 'express';
import { requireTier } from '../middleware/authorize';
import { getLogs } from '../controllers/logs';

const router = Router();

router.get('/', requireTier(['admin']), getLogs);

export default router;
