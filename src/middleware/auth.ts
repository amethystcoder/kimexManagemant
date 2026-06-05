import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session || !(req.session as any).user) {
    if (req.originalUrl.startsWith('/api/')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    res.redirect('/login/login.html');
    return;
  }

  next();
};
