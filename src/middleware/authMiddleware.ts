import { NextFunction, Request, Response } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sessionUser = (req.session as any)?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};