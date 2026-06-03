import { Request, Response } from 'express';
import { readUsers, findUserById, deactivateUser } from '../services/userService';

const sanitizeUser = (user: ReturnType<typeof findUserById> extends Promise<infer U> ? U : any) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

export const listUsers = async (_req: Request, res: Response) => {
  const users = await readUsers();
  return res.json(users.map((user) => {
    const { password, ...safeUser } = user;
    return safeUser;
  }));
};

export const getUser = async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!userId) {
    return res.status(400).json({ message: 'Missing user id' });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const safeUser = sanitizeUser(user);
  return res.json(safeUser);
};

export const deleteUser = async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!userId) {
    return res.status(400).json({ message: 'Missing user id' });
  }

  const deleted = await deactivateUser(userId);
  if (!deleted) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ success: true, message: 'User deactivated' });
};
