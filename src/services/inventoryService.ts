import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STORE_DIR = path.resolve(process.cwd(), process.env.STORE_DIR || 'src/store');
const INVENTORY_FILE = path.join(STORE_DIR, 'inventory.csv');

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  sku: string;
  qty: number;
  reorder: number;
  unit: string;
  price: number;
  supplier: string;
  restockDate: string;
  expiry: string;
  addedBy: string;
}

const HEADERS = ['id', 'name', 'type', 'sku', 'qty', 'reorder', 'unit', 'price', 'supplier', 'restockDate', 'expiry', 'addedBy'] as const;

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export const readInventory = async (): Promise<InventoryItem[]> => {
  try {
    const raw = await readFile(INVENTORY_FILE, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim() !== '');
    if (lines.length <= 1) return [];
    return lines.slice(1).map(line => {
      const c = parseCsvLine(line);
      return {
        id: c[0], name: c[1], type: c[2], sku: c[3],
        qty: Number(c[4]) || 0, reorder: Number(c[5]) || 10,
        unit: c[6], price: Number(c[7]) || 0, supplier: c[8],
        restockDate: c[9], expiry: c[10], addedBy: c[11] || 'system',
      };
    });
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
};

export const writeInventory = async (items: InventoryItem[]): Promise<void> => {
  await mkdir(STORE_DIR, { recursive: true });
  const header = HEADERS.join(',');
  const rows = items.map(item =>
    HEADERS.map(h => escapeCsv((item as unknown as Record<string, unknown>)[h])).join(',')
  );
  await writeFile(INVENTORY_FILE, [header, ...rows].join('\n'), 'utf-8');
};

const newId = () => `inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

export const addOrUpdateInventoryItem = async (
  entry: Partial<InventoryItem> & { name: string; qty: number },
  addedBy?: string
): Promise<InventoryItem> => {
  const items = await readInventory();
  const today = new Date().toISOString().slice(0, 10);

  const existing = items.find(i =>
    (entry.sku && entry.sku !== 'AUTO' && i.sku.toLowerCase() === entry.sku.toLowerCase()) ||
    i.name.toLowerCase() === entry.name.toLowerCase()
  );

  if (existing) {
    const updated: InventoryItem = {
      ...existing,
      qty: existing.qty + Number(entry.qty),
      restockDate: today,
      ...(entry.expiry ? { expiry: entry.expiry } : {}),
      ...(entry.price != null ? { price: Number(entry.price) } : {}),
      ...(entry.supplier ? { supplier: entry.supplier } : {}),
    };
    await writeInventory(items.map(i => (i.id === existing.id ? updated : i)));
    return updated;
  }

  const newItem: InventoryItem = {
    id: newId(),
    name: entry.name,
    type: entry.type || 'Dry',
    sku: entry.sku || `AUTO-${Date.now()}`,
    qty: Number(entry.qty),
    reorder: Number(entry.reorder) || 10,
    unit: entry.unit || '1 unit',
    price: Number(entry.price) || 0,
    supplier: entry.supplier || '',
    restockDate: today,
    expiry: entry.expiry || '2027-01-01',
    addedBy: addedBy || entry.addedBy || 'system',
  };
  await writeInventory([...items, newItem]);
  return newItem;
};

export const updateInventoryItem = async (id: string, patch: Partial<InventoryItem>): Promise<InventoryItem | null> => {
  const items = await readInventory();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  const updated: InventoryItem = { ...items[idx], ...patch };
  items[idx] = updated;
  await writeInventory(items);
  return updated;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
  const items = await readInventory();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeInventory(filtered);
  return true;
};

export const initInventory = async (): Promise<void> => {
  await mkdir(STORE_DIR, { recursive: true });
};
