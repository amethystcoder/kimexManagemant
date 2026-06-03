import { Router } from 'express';
import { requireTier } from '../middleware/authorize';
import { listUsers, getUser, deleteUser } from '../controllers/users';

const router = Router();

router.get('/', requireTier(['admin']), listUsers);
router.get('/:id', requireTier(['admin']), getUser);
router.delete('/:id', requireTier(['admin']), deleteUser);

export default router;
