import { Router } from 'express';
import {
  listInventory, createInventoryItem, patchInventoryItem,
  removeInventoryItem, bulkRestock,
} from '../controllers/inventory';

const router = Router();

router.get('/', listInventory);
router.post('/', createInventoryItem);
router.put('/:id', patchInventoryItem);
router.delete('/:id', removeInventoryItem);
router.post('/restock', bulkRestock);

export default router;
