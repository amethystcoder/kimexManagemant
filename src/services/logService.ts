import { readFile } from 'fs/promises';
import path from 'path';
import { LogEntry } from '../shared/utils/logger';

const getLogPath = () => path.resolve(process.cwd(), process.env.DATA_DIR || 'data', 'logs.jsonl');

export const readLogs = async (limit = 250): Promise<LogEntry[]> => {
  try {
    const data = await readFile(getLogPath(), 'utf-8');
    const lines = data.split('\n').filter((line) => line.trim() !== '');
    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null)
      .slice(-limit);

    return parsed;
  } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    console.error('Error reading logs:', error);
    return [];
  }
};
