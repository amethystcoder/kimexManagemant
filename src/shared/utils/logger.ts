import crypto from 'crypto';
import winston from 'winston';
import { appendLog } from '../../config/store';

export type LogEntry = {
  id: string;
  user_id: string | null;
  username: string | null;
  tier: string | null;
  action: string;
  module: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

export const log = async (entry: Omit<LogEntry, 'id' | 'created_at'>): Promise<LogEntry> => {
  const record: LogEntry = {
    id: newId('log'),
    ...entry,
    created_at: new Date().toISOString(),
  };

  await appendLog('logs.jsonl', record);
  logger.info(JSON.stringify(record));
  return record;
};
