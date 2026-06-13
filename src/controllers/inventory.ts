import { Request, Response } from 'express';
import {
  readInventory, addOrUpdateInventoryItem, updateInventoryItem,
  deleteInventoryItem, InventoryItem,
} from '../services/inventoryService';
import { log } from '../shared/utils/logger';

export const listInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await readInventory();
    res.json(items);
  } catch (err) {
    console.error('listInventory error:', err);
    res.status(500).json({ message: 'Failed to read inventory.' });
  }
};

export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const entry = req.body as Partial<InventoryItem> & { name?: string; qty?: number };
  if (!entry.name || entry.qty == null) {
    res.status(400).json({ message: 'name and qty are required.' });
    return;
  }
  const actor = (req.session as any)?.user;
  try {
    const item = await addOrUpdateInventoryItem(
      { ...entry, name: entry.name, qty: Number(entry.qty) },
      actor?.username || 'system'
    );
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: 'CREATE_INVENTORY_ITEM', module: 'inventory',
      details: { name: item.name, sku: item.sku, qty: item.qty },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('createInventoryItem error:', err);
    res.status(500).json({ message: 'Failed to create inventory item.' });
  }
};

export const patchInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const patch = req.body as Partial<InventoryItem>;
  const actor = (req.session as any)?.user;
  try {
    const updated = await updateInventoryItem(id, patch);
    if (!updated) { res.status(404).json({ message: 'Item not found.' }); return; }
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: 'UPDATE_INVENTORY_ITEM', module: 'inventory',
      details: { id, ...patch },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.json(updated);
  } catch (err) {
    console.error('patchInventoryItem error:', err);
    res.status(500).json({ message: 'Failed to update inventory item.' });
  }
};

export const removeInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const actor = (req.session as any)?.user;
  try {
    const ok = await deleteInventoryItem(id);
    if (!ok) { res.status(404).json({ message: 'Item not found.' }); return; }
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: 'DELETE_INVENTORY_ITEM', module: 'inventory', details: { id },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('removeInventoryItem error:', err);
    res.status(500).json({ message: 'Failed to delete inventory item.' });
  }
};

/* Bulk restock: receives array of delivery lines, calls addOrUpdate for each */
export const bulkRestock = async (req: Request, res: Response): Promise<void> => {
  const lines = req.body.lines as (Partial<InventoryItem> & { name: string; qty: number })[];
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ message: 'lines array is required.' });
    return;
  }
  const actor = (req.session as any)?.user;
  try {
    const results: InventoryItem[] = [];
    for (const line of lines) {
      if (!line.name || !(Number(line.qty) > 0)) continue;
      const item = await addOrUpdateInventoryItem(line, actor?.username || 'system');
      results.push(item);
    }
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: 'BULK_RESTOCK', module: 'inventory',
      details: { lineCount: lines.length, itemCount: results.length },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.status(200).json({ success: true, items: results });
  } catch (err) {
    console.error('bulkRestock error:', err);
    res.status(500).json({ message: 'Failed to process bulk restock.' });
  }
};
