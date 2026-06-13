import { Router } from 'express';
import { requireTier } from '../middleware/authorize';
import { listUsers, getUser, deleteUser, createNewUser, updateExistingUser, toggleUserActive } from '../controllers/users';

const router = Router();

router.get('/', requireTier(['admin']), listUsers);
router.get('/:id', requireTier(['admin']), getUser);
router.post('/', requireTier(['admin']), createNewUser);
router.put('/:id', requireTier(['admin']), updateExistingUser);
router.patch('/:id/toggle', requireTier(['admin']), toggleUserActive);
router.delete('/:id', requireTier(['admin']), deleteUser);

export default router;
