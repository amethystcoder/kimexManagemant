import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';
import { readPlexStore, writePlexStore } from '../config/store';
import { User, UserCreatePayload, UserUpdatePayload } from '../types/authTypes';

const USERS_FILE = path.resolve(process.cwd(), process.env.USERS_FILE || 'src/model/users.plex');
const SALT_ROUNDS = 12;

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

export const readUsers = async (): Promise<User[]> => {
  return await readPlexStore<User[]>(USERS_FILE, []);
};

export const writeUsers = async (users: User[]): Promise<void> => {
  await writePlexStore<User[]>(USERS_FILE, users);
};

export const findUserByUsername = async (username: string): Promise<User | undefined> => {
  const users = await readUsers();
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase());
};

export const findUserById = async (id: string): Promise<User | undefined> => {
  const users = await readUsers();
  return users.find((user) => user.id === id);
};

export const createUser = async (payload: UserCreatePayload): Promise<User> => {
  const users = await readUsers();
  const now = new Date().toISOString();

  const newUser: User = {
    id: newId('usr'),
    username: payload.username.toLowerCase(),
    password: await bcrypt.hash(payload.password, SALT_ROUNDS),
    full_name: payload.full_name,
    tier: payload.tier,
    is_active: payload.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  users.push(newUser);
  await writeUsers(users);
  return newUser;
};

export const updateUser = async (id: string, payload: UserUpdatePayload): Promise<User | null> => {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;

  const updatedUser = {
    ...users[index],
    ...payload,
    username: payload.username ? payload.username.toLowerCase() : users[index].username,
    updated_at: new Date().toISOString(),
  };

  if (payload.password) {
    updatedUser.password = await bcrypt.hash(payload.password, SALT_ROUNDS);
  }

  users[index] = updatedUser;
  await writeUsers(users);
  return updatedUser;
};

export const deactivateUser = async (id: string): Promise<User | null> => {
  return await updateUser(id, { is_active: false });
};
