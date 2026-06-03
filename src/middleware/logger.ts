import { Request, Response, NextFunction } from 'express';
import { log } from '../shared/utils/logger';

const pageActionMap: Record<string, string> = {
  dashboard: 'VIEW_DASHBOARD',
  tags: 'VIEW_TAG_GENERATOR',
  statements: 'VIEW_STATEMENTS',
  restock: 'VIEW_STOCK',
  logs: 'VIEW_LOGS',
  users: 'VIEW_USERS',
};

export const pageViewLogger = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/') || /\.(js|css|png|svg|jpg|jpeg|map)$/.test(req.path)) return next();
  if (!req.session || !(req.session as any).user) return next();

  const moduleKey = req.path.split('/').filter(Boolean)[0] || 'dashboard';
  const action = pageActionMap[moduleKey] || `VIEW_${moduleKey.toUpperCase()}`;

  try {
    await log({
      user_id: (req.session as any).user?.id ?? null,
      username: (req.session as any).user?.username ?? null,
      tier: (req.session as any).user?.tier ?? null,
      action,
      module: moduleKey,
      details: null,
      ip_address: req.ip ?? null,
      user_agent: req.get('User-Agent') ?? null,
    });
  } catch (error) {
    console.error('Page view logging failed:', error);
  }

  next();
};
