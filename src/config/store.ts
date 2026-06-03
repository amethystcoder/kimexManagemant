import { readFile, writeFile, appendFile, mkdir, rename } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');

export const readStore = async <T>(filename: string, defaultValue: T): Promise<T> => {
  try {
    const raw = await readFile(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`Error reading store ${filename}:`, error);
    }
    return defaultValue;
  }
};

export const writeStore = async <T>(filename: string, data: T): Promise<void> => {
  await mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await rename(tmpPath, filePath);
};

export const appendLog = async (filename: string, entry: object): Promise<void> => {
  await mkdir(DATA_DIR, { recursive: true });
  const line = JSON.stringify(entry) + '\n';
  await appendFile(path.join(DATA_DIR, filename), line, 'utf-8');
};
