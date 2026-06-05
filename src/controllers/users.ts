import { Request, Response } from 'express';
import { User } from '../types/authTypes';
import { readUsers, findUserById, deactivateUser } from '../services/userService';

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

  if (!userId) {
    res.status(400).json({ message: 'Missing user id' });
    return;
  }

  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json(sanitizeUser(user));
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!userId) {
    res.status(400).json({ message: 'Missing user id' });
    return;
  }

  const deleted = await deactivateUser(userId);
  if (!deleted) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json({ success: true, message: 'User deactivated' });
};
