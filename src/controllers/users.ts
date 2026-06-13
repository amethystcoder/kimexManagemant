import { Request, Response } from 'express';
import { User } from '../types/authTypes';
import { readUsers, findUserById, deactivateUser, createUser, updateUser } from '../services/userService';
import { log } from '../shared/utils/logger';

const sanitizeUser = (user: User) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await readUsers();
  res.json(users.map(sanitizeUser));
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!userId) { res.status(400).json({ message: 'Missing user id' }); return; }
  const user = await findUserById(userId);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(sanitizeUser(user));
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!userId) { res.status(400).json({ message: 'Missing user id' }); return; }
  const deleted = await deactivateUser(userId);
  if (!deleted) { res.status(404).json({ message: 'User not found' }); return; }
  res.json({ success: true, message: 'User deactivated' });
};

export const createNewUser = async (req: Request, res: Response): Promise<void> => {
  const { full_name, username, email, tier, password, is_active } = req.body;
  if (!full_name || !username || !password) {
    res.status(400).json({ message: 'full_name, username and password are required.' });
    return;
  }
  const validTiers = ['admin', 'user', 'general'];
  const resolvedTier = validTiers.includes(tier) ? tier : 'general';
  const actor = (req.session as any)?.user;
  try {
    const user = await createUser({
      full_name,
      username,
      password,
      tier: resolvedTier,
      is_active: is_active !== false,
    });
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: 'CREATE_USER', module: 'users',
      details: { created: user.username, email: email || null, tier: resolvedTier },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.status(201).json(sanitizeUser(user));
  } catch (err) {
    console.error('createNewUser error:', err);
    res.status(500).json({ message: 'Failed to create user.' });
  }
};

export const updateExistingUser = async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!userId) { res.status(400).json({ message: 'Missing user id' }); return; }
  const patch = req.body;
  const actor = (req.session as any)?.user;
  try {
    const updated = await updateUser(userId, patch);
    if (!updated) { res.status(404).json({ message: 'User not found' }); return; }
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: 'UPDATE_USER', module: 'users',
      details: { targetId: userId, fields: Object.keys(patch) },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.json(sanitizeUser(updated));
  } catch (err) {
    console.error('updateExistingUser error:', err);
    res.status(500).json({ message: 'Failed to update user.' });
  }
};

export const toggleUserActive = async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!userId) { res.status(400).json({ message: 'Missing user id' }); return; }
  const actor = (req.session as any)?.user;
  try {
    const user = await findUserById(userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    const updated = await updateUser(userId, { is_active: !user.is_active });
    await log({
      user_id: actor?.id ?? null, username: actor?.username ?? null, tier: actor?.tier ?? null,
      action: user.is_active ? 'DEACTIVATE_USER' : 'ACTIVATE_USER', module: 'users',
      details: { targetId: userId, targetUsername: user.username },
      ip_address: req.ip ?? null, user_agent: req.get('User-Agent') ?? null,
    });
    res.json(sanitizeUser(updated!));
  } catch (err) {
    console.error('toggleUserActive error:', err);
    res.status(500).json({ message: 'Failed to toggle user status.' });
  }
};
