import { promises as fs } from 'fs';
import path from 'path';
import { findUserByUsername, createUser } from '../services/userService';
import { initInventory } from '../services/inventoryService';

const dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');
const logsPath = path.join(dataDir, 'logs.jsonl');

const ensureDirectory = async () => {
  await fs.mkdir(dataDir, { recursive: true });
};

export const initializeData = async () => {
  await ensureDirectory();

  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'changeme123';

  const existingAdmin = await findUserByUsername(adminUsername);
  if (!existingAdmin) {
    await createUser({
      username: adminUsername,
      password: adminPassword,
      full_name: 'System Administrator',
      tier: 'admin',
      is_active: true,
    });
    console.log(`Seeded default admin user: ${adminUsername}`);
  }

  try {
    await fs.access(logsPath);
  } catch {
    await fs.writeFile(logsPath, '', 'utf-8');
  }

  await initInventory();
};
