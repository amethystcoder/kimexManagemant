import { Request, Response } from 'express';
import { readLogs } from '../services/logService';

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  const limit = Number(req.query.limit ?? 250);
  const logs = await readLogs(limit);
  res.json(logs);
};
