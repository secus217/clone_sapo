import {initORM, Services} from "../db"
import {Elysia} from "elysia"
import {Orders, ExportNote, OrderDetail, ExportNoteDetail, ReceiptNote, Product, Inventory} from "../entities/index";
import {QueryOrder, wrap} from "@mikro-orm/core";

export class ExportNoteService {
    async createNewExportNote(userId: number, data: {
        fromStoreId: number,
        toStoreId: number,
        product: Array<{
            productId: number;
            quantity: number;
        }>,
        note?: string
    }) {
        try {
            const db = await initORM()
            const inventories = await this.getProductsByStoreIdsAndProductsId(data.fromStoreId, data.product, db);
            const {totalQuantity} = this.validateProductQuantity(inventories, data.product);
            const newExportNote = await this.createExportNote(db, totalQuantity, data, userId);
            const exportDetails = data.product.map(product => db.em.create(ExportNoteDetail, {
                exportNoteId: newExportNote.id,
                productId: product.productId,
                quantity: product.quantity,
            }))
            await this.updateInventoryQuantity(inventories, exportDetails, db);
            await db.em.flush();
            return {
                newExportNote,
                exportDetails
            }
        } catch (e: any) {
            throw new Error(e.message);
        }
    }
    async getProductsByStoreIdsAndProductsId(storeId: number, product: any[], db: Services) {
        const inventories = await db.inventory.find({
            storeId: storeId,
            productId: {$in: product.map(product => product.productId)}
        });

        if (!inventories.length || inventories.length !== product.length) {
            throw new Error("No such product");
        }
        return inventories;
    }
    async createExportNote(db: Services, totalQuantity: number, data: any, userId: number) {
        const newExportNote = new ExportNote();
        newExportNote.fromStoreId = data.fromStoreId;
        newExportNote.toStoreId = data.toStoreId;
        newExportNote.totalQuantity = totalQuantity;
        newExportNote.status = "pending";
        newExportNote.note = data.note;
        newExportNote.createrId = userId;
        await db.em.persistAndFlush(newExportNote);
        return newExportNote;
    }

    async updateInventoryQuantity(inventories: any[], exportDetails: ExportNoteDetail[], db: Services) {
        for (const item of inventories) {
            const detailExportedOfProduct = exportDetails.find(detail => detail.productId === item.productId);
            if (!detailExportedOfProduct) continue;
            db.em.assign(item, {
                quantity: item.quantity - detailExportedOfProduct.quantity
            })
            await db.em.persistAndFlush(item)
        }
    }

    validateProductQuantity(inventories: any, products: any[]) {
        const inventoryMap = new Map<number, number>();
        for (const item of inventories) {
            inventoryMap.set(item.productId, item.quantity);
        }
        let totalQuantity = 0;
        for (const product of products) {
            totalQuantity += product.quantity;
            const availableQuantity = inventoryMap.get(product.productId);
            if (!availableQuantity || availableQuantity < product.quantity) {
                throw new Error(`store with id ${availableQuantity || 0} is out of stock for product id ${product.productId}`);
            }
        }
        return {totalQuantity, inventoryMap};
    }

}

export default new Elysia().decorate("exportNoteService", new ExportNoteService())
