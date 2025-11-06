export type Restock = "Restock" | "Restock Request";
export type ItemType = "Frozen" | "Dry";
export interface RestockItem {
    id: string;
    productName: string;
    productType: ItemType;
    quantity: number;
    restockDate: Date;
    restockTime: string;
    expiryDate: Date;
    restockBy: string;
    status: Restock;
    remarks?: string;
}
export type NewRestockItem = Omit<RestockItem, 'id' | 'restockTime' | 'status' | 'restockDate'>;