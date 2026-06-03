import { Request, Response, NextFunction } from 'express';

export type Tier = 'general' | 'user' | 'admin';

export const requireTier = (allowed: Tier[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const tier = (req.session as any)?.user?.tier as Tier | undefined;

    if (tier === 'admin' || (tier && allowed.includes(tier))) {
      return next();
    }

    return res.status(403).send('Access denied');
  };
};
