import { readStore, writeStore } from '../config/store';
import { NewRestockItem, RestockItem } from '../types/restockTypes';

const RESTOCK_FILE = 'restocks.json';

export type StoredRestockItem = Omit<RestockItem, 'restockDate' | 'expiryDate'> & {
  restockDate: string;
  expiryDate: string;
};

const mapStoredToRestock = (stored: StoredRestockItem): RestockItem => ({
  ...stored,
  restockDate: new Date(stored.restockDate),
  expiryDate: new Date(stored.expiryDate),
});

const mapRestockToStored = (item: Omit<RestockItem, 'restockDate' | 'expiryDate'> & { restockDate: Date; expiryDate: Date }): StoredRestockItem => ({
  ...item,
  restockDate: item.restockDate.toISOString(),
  expiryDate: item.expiryDate.toISOString(),
});

export const readRestocks = async (): Promise<RestockItem[]> => {
  const stored = await readStore<StoredRestockItem[]>(RESTOCK_FILE, []);
  return stored.map(mapStoredToRestock);
};

export const saveRestocks = async (items: RestockItem[]): Promise<void> => {
  const stored = items.map((item) => mapRestockToStored(item));
  await writeStore<StoredRestockItem[]>(RESTOCK_FILE, stored);
};

export const addRestockItems = async (items: Omit<RestockItem, 'id' | 'restockDate' | 'restockTime' | 'status'>[]): Promise<RestockItem[]> => {
  const existing = await readRestocks();
  const now = new Date();

  const newItems: RestockItem[] = items.map((item, index) => ({
    id: (existing.length + index + 1).toString(),
    productName: item.productName,
    productType: item.productType,
    quantity: item.quantity,
    restockDate: now,
    restockTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
    expiryDate: new Date(item.expiryDate),
    restockBy: item.restockBy,
    status: 'Restock',
    remarks: item.remarks,
  }));

  await saveRestocks([...existing, ...newItems]);
  return newItems;
};
