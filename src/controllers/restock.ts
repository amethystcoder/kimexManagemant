import { readFileSync,writeFileSync } from 'fs';
import { Request, Response } from 'express';
import { NewRestockItem, RestockItem } from '../types/restockTypes';
import path from 'path';
import { WriteToLog } from '../services/logger';
import { LogEntry,LogEntryWithoutContext } from '../types/loggerTypes';

const restockFilePath = path.join(__dirname,"../model/restocking.csv");

//note to self: 

const tableHeaders:string[] = ["S/N", "Product Name", "Product Type", "Quantity", "Restock Date", "Restock Time", "Expiry Date", "Restock By", "Status", "Remarks" ];

export const restock = (req: Request, res: Response) => {
    try{
        const data:string = readFileSync(restockFilePath, { encoding: 'utf8' });

        const lines = data.split('\n').filter((line, index) => line.trim() !== '' && index != 0);
        //get current time
        const currentTime = new Date();
        const PresentrestockTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}`;
        const restockItems: RestockItem[] = lines.map((line) => {
            const [id, productName, productType, quantity, restockDate, restockTime, expiryDate, restockBy, status, remarks] = line.split(',');
            return {
                id,
                productName,
                productType: productType as "Frozen" | "Dry",
                quantity: parseInt(quantity),
                restockDate: new Date(restockDate),
                restockTime,
                expiryDate: new Date(expiryDate),
                restockBy,
                status: status as "Restock" | "Restock Request",
                remarks
            };
        });

        const restockList = req.body.restockList as NewRestockItem[] | undefined;
        if (!restockList || !Array.isArray(restockList)) {
            res.status(400).send("Invalid restock list provided.");
            return;
        }
        for (const item of restockList) {
            if (!item.productName || !item.productType || !item.quantity || !item.restockBy) {
                res.status(400).send("Missing required fields in restock item.");
                return;
            }
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                res.status(400).send("Quantity must be a positive number.");
                return;
            }
        }

        const restockItemsToAdd: RestockItem[] = restockList.map((item) => {
            return {
                id: (restockItems.length + 1).toString(),
                productName: item.productName,
                productType: item.productType,
                quantity: item.quantity,
                restockDate: new Date(),
                restockTime: PresentrestockTime,
                expiryDate: new Date(item.expiryDate),
                restockBy: item.restockBy,
                status: "Restock",
                remarks: item.remarks || ""
            }
        })

        restockItems.push(...restockItemsToAdd);
        const csvContent = [tableHeaders.join(","), ...restockItems.map(item => 
            `${item.id},${item.productName},${item.productType},${item.quantity},${item.restockDate},${item.restockTime},${item.expiryDate},${item.restockBy},${item.status},${item.remarks || ''}`
        )].join('\n');
        writeFileSync(restockFilePath, csvContent, { encoding: 'utf8' });
        WriteToLog({
            timestamp: new Date().toISOString(),
            level: "info",
            message: "A user entered stock"
        })
        
        res.status(201).send({
            success:true,
            message: "created successfully"
        })
    }
    catch(error:any) {
        console.error(`Error in restock: ${error.message || error}`);
        res.status(500).send(`Error in restock: ${error.message || error}`);
        return;

    }
}


export const getAllRestocks = (req: Request, res: Response) => {
    try {
        const data: string = readFileSync(restockFilePath, { encoding: 'utf8' });
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        const restockItems: RestockItem[] = lines.slice(1).map((line, index) => {
            const [id, productName, productType, quantity, restockDate, restockTime, expiryDate, restockBy, status, remarks] = line.split(',');
            return {
                id,
                productName,
                productType: productType as "Frozen" | "Dry",
                quantity: parseInt(quantity),
                restockDate: new Date(restockDate),
                restockTime,
                expiryDate: new Date(expiryDate),
                restockBy,
                status: status as "Restock" | "Restock Request",
                remarks
            };
        });

        res.json(restockItems);
    } catch (error:any) {
        console.error(`Error in getAllRestockItems: ${error.message || error}`);
        res.status(500).send(`Error in getAllRestockItems: ${error.message || error}`);
    }
}