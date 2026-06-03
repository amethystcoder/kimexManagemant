import { Request, Response } from 'express';
import { addRestockItems, readRestocks } from '../services/restockService';
import { log } from '../shared/utils/logger';
import { NewRestockItem } from '../types/restockTypes';

export const restock = async (req: Request, res: Response) => {
  const restockList = req.body.restockList as NewRestockItem[] | undefined;
  if (!restockList || !Array.isArray(restockList)) {
    return res.status(400).json({ message: 'Invalid restock list provided.' });
  }

  for (const item of restockList) {
    if (!item.productName || !item.productType || !item.quantity) {
      return res.status(400).json({ message: 'Missing required fields in restock item.' });
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
    }
  }

  const actor = (req.session as any)?.user;
  const restockBy = actor?.full_name || actor?.username || 'unknown';

  try {
    const createdItems = await addRestockItems(
      restockList.map((item) => ({
        ...item,
        restockBy,
        status: 'Restock',
      }))
    );

    await log({
      user_id: actor?.id ?? null,
      username: actor?.username ?? null,
      tier: actor?.tier ?? null,
      action: 'CREATE_RESTOCK',
      module: 'restock',
      details: { count: createdItems.length },
      ip_address: req.ip ?? null,
      user_agent: req.get('User-Agent') ?? null,
    });

    return res.status(201).json({ success: true, createdItems });
  } catch (error: any) {
    console.error('Restock error:', error);
    return res.status(500).json({ message: 'Failed to process restock request.' });
  }
};

export const getAllRestocks = async (_req: Request, res: Response) => {
  try {
    const restockItems = await readRestocks();
    res.json(restockItems);
  } catch (error: any) {
    console.error('Fetch restocks error:', error);
    res.status(500).json({ message: 'Failed to load restock items.' });
  }
};
