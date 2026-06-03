import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { findUserByUsername, findUserById, createUser, updateUser, deactivateUser } from '../services/userService';
import { LoginRequest, UserCreatePayload, UserUpdatePayload } from '../types/authTypes';
import { log } from '../shared/utils/logger';

export const loginUser = async (req: Request, res: Response) => {
  const payload = req.body as LoginRequest;
  if (!payload.username || !payload.password) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const user = await findUserByUsername(payload.username);
  const genericResponse = { success: false, message: 'Invalid credentials' };

  if (!user || !user.is_active) {
    await log({
      user_id: user?.id ?? null,
      username: payload.username ?? null,
      tier: user?.tier ?? null,
      action: 'LOGIN_FAILED',
      module: 'auth',
      details: { reason: 'invalid credentials' },
      ip_address: req.ip ?? null,
      user_agent: req.get('User-Agent') ?? null,
    });
    return res.status(401).json(genericResponse);
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);
  if (!passwordMatches) {
    await log({
      user_id: user.id,
      username: user.username,
      tier: user.tier,
      action: 'LOGIN_FAILED',
      module: 'auth',
      details: { reason: 'invalid credentials' },
      ip_address: req.ip ?? null,
      user_agent: req.get('User-Agent') ?? null,
    });
    return res.status(401).json(genericResponse);
  }

  req.session.regenerate((err) => {
    if (err) {
      console.error('Session regeneration failed:', err);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }

    (req.session as any).user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      tier: user.tier,
    };

    log({
      user_id: user.id,
      username: user.username,
      tier: user.tier,
      action: 'LOGIN_SUCCESS',
      module: 'auth',
      details: null,
      ip_address: req.ip ?? null,
      user_agent: req.get('User-Agent') ?? null,
    }).catch((e) => console.error('Logging failed:', e));

    res.json({ success: true, user: { id: user.id, username: user.username, full_name: user.full_name, tier: user.tier } });
  });
};

export const logoutUser = async (req: Request, res: Response) => {
  const sessionUser = (req.session as any)?.user;
  req.session.destroy(async (err) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    await log({
      user_id: sessionUser?.id ?? null,
      username: sessionUser?.username ?? null,
      tier: sessionUser?.tier ?? null,
      action: 'LOGOUT',
      module: 'auth',
      details: null,
      ip_address: req.ip ?? null,
      user_agent: req.get('User-Agent') ?? null,
    }).catch(() => undefined);
    res.json({ success: true });
  });
};

export const getUserProfile = async (req: Request, res: Response) => {
  const userId = req.query.id as string;
  if (!userId) return res.status(400).json({ message: 'Missing user id' });
  const user = await findUserById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
};

export const registerUser = async (req: Request, res: Response) => {
  const payload = req.body as UserCreatePayload;
  if (!payload.username || !payload.password || !payload.full_name || !payload.tier) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const existing = await findUserByUsername(payload.username);
  if (existing) return res.status(400).json({ message: 'Username already exists' });

  const user = await createUser(payload);
  const { password, ...safeUser } = user;
  await log({
    user_id: null,
    username: safeUser.username,
    tier: safeUser.tier,
    action: 'CREATE_USER',
    module: 'users',
    details: { username: safeUser.username, tier: safeUser.tier },
    ip_address: req.ip ?? null,
    user_agent: req.get('User-Agent') ?? null,
  }).catch(() => undefined);
  res.status(201).json(safeUser);
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const userId = req.query.id as string;
  if (!userId) return res.status(400).json({ message: 'Missing user id' });

  const payload = req.body as UserUpdatePayload;
  const updated = await updateUser(userId, payload);
  if (!updated) return res.status(404).json({ message: 'User not found' });

  await log({
    user_id: updated.id,
    username: updated.username,
    tier: updated.tier,
    action: 'UPDATE_USER',
    module: 'users',
    details: { updatedFields: Object.keys(payload) },
    ip_address: req.ip ?? null,
    user_agent: req.get('User-Agent') ?? null,
  }).catch(() => undefined);

  const { password, ...safeUser } = updated;
  res.json(safeUser);
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  const userId = req.query.id as string;
  if (!userId) return res.status(400).json({ message: 'Missing user id' });
  const deleted = await deactivateUser(userId);
  if (!deleted) return res.status(404).json({ message: 'User not found' });

  await log({
    user_id: deleted.id,
    username: deleted.username,
    tier: deleted.tier,
    action: 'DEACTIVATE_USER',
    module: 'users',
    details: null,
    ip_address: req.ip ?? null,
    user_agent: req.get('User-Agent') ?? null,
  }).catch(() => undefined);

  res.json({ success: true });
};

export const changeUserPassword = async (req: Request, res: Response) => {
  const userId = req.query.id as string;
  const newPassword = req.body?.password as string | undefined;

  if (!userId || !newPassword) {
    return res.status(400).json({ message: 'Missing user id or new password' });
  }

  const updated = await updateUser(userId, { password: newPassword });
  if (!updated) return res.status(404).json({ message: 'User not found' });

  await log({
    user_id: updated.id,
    username: updated.username,
    tier: updated.tier,
    action: 'CHANGE_PASSWORD',
    module: 'auth',
    details: null,
    ip_address: req.ip ?? null,
    user_agent: req.get('User-Agent') ?? null,
  }).catch(() => undefined);

  res.json({ success: true });
};
