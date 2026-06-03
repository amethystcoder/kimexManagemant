import { Request, Response } from 'express';
import { modules } from '../modules/registry';

export const getModules = (req: Request, res: Response) => {
  const tier = (req.session as any)?.user?.tier as 'general' | 'user' | 'admin' | undefined;
  if (!tier) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const available = modules.filter((module) => module.tier.includes(tier));
  res.json(available);
};
