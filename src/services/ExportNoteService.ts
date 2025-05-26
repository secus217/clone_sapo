import {initORM, Services} from "../db"
import {Elysia} from "elysia"
import {ExportNote, ExportNoteDetail} from "../entities/index";
import {Product, Store} from "../entities";

export class ExportNoteService {
    async createNewExportNote(userId: number, data: {
        fromStoreId: number,
        toStoreId: number,
        product: Array<{
            productId: number;
            quantity: number;
        }>,
        note?: string,
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
            throw new Error("Product not found in inventory");
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
        newExportNote.type = "xuat";
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

    async updateInventoryForImport(db: Services, exportNote: ExportNote, exportDetails: ExportNoteDetail[]) {
        const productIds = exportDetails.map(product => product.productId);
        const existInventories = await db.inventory.find({
            storeId: exportNote.toStoreId,
            productId: {$in: productIds}
        });
        const inventoryMap = new Map(existInventories.map(inv => [inv.productId, inv]));
        const inventoryUpdates = exportDetails.map(item => {
            let inventory = inventoryMap.get(item.productId);
            if (!inventory) {
                inventory = db.inventory.create({
                    storeId: exportNote.toStoreId,
                    productId: item.productId,
                    quantity: item.quantity,
                });
            } else {
                inventory.quantity += item.quantity;
            }
            return inventory;
        })
        await db.em.persistAndFlush(inventoryUpdates);
    }

    async aprroveImportNote(userId: number, data: {
        exportNoteId: number,
    }) {
        const db = await initORM()
        const exportNote = await db.exportNote.findOneOrFail(data.exportNoteId);
        const exportNoteDetail = await db.exportNoteDetail.find({
            exportNoteId: data.exportNoteId
        });
        await this.updateInventoryForImport(db, exportNote, exportNoteDetail);
        db.em.assign(exportNote, {
            status: "completed"
        });
        const newImportNote = new ExportNote();
        newImportNote.fromStoreId = exportNote.fromStoreId;
        newImportNote.toStoreId = exportNote.toStoreId;
        newImportNote.createrId = userId;
        newImportNote.totalQuantity = exportNote.totalQuantity;
        newImportNote.status = "completed";
        newImportNote.type = "nhap";
        await db.em.persistAndFlush(newImportNote);
        const importDetails = exportNoteDetail.map(detail => {
            return db.em.create(ExportNoteDetail, {
                exportNoteId: newImportNote.id,
                productId: detail.productId,
                quantity: detail.quantity,
            });
        });
        await db.em.persistAndFlush(importDetails);
        return {
            newImportNote
        }
    }

    async getListExportNote(page: number = 1, limit: number = 10, filter: {
        storeId?: number,
        type?: "xuat" | "nhap"
    }) {
        const db = await initORM();
        const offset: number = (page - 1) * limit;
        let where: any = {};
        if (filter.storeId) {
            where = {
                $or: [
                    {fromStoreId: filter.storeId},
                    {toStoreId: filter.storeId}
                ]
            };
        }
        if (filter.type) {
            where.type = filter.type;
        }
        const [exportNotes,total] = await db.exportNote.findAndCount(where, {
            limit,
            offset
        });
        const fromStoreIds = exportNotes.map(item => item.fromStoreId).filter((id): id is number => id !== undefined);
        const toStoreIds = exportNotes.map(item => item.toStoreId).filter((id): id is number => id !== undefined);
        const createrIds = exportNotes.map(item => item.createrId).filter((id): id is number => id !== undefined);
        const creaters = await db.user.find({
            id: {$in: createrIds},
        },{
            fields:["id","username","address","phone","role","storeId"]
            }
        );
        const fromStores = await db.store.find({
            id: {$in: fromStoreIds}
        })
        const toStores = await db.store.find({
            id: {$in: toStoreIds}
        });
        const fromStoreMap = new Map(fromStores.map(from => [from.id, from]));
        const toStoreMap = new Map(toStores.map(to => [to.id, to]));
        const createrMap = new Map(creaters.map(creater => [creater.id, creater]));
        const totalPage=Math.ceil(total/limit);
        const exs= exportNotes.map(item => {
            const fromStore = item.fromStoreId !== undefined ? fromStoreMap.get(item.fromStoreId) : undefined;
            const toStore = item.toStoreId !== undefined ? toStoreMap.get(item.toStoreId) : undefined;
            const creater = item.createrId !== undefined ? createrMap.get(item.createrId) : undefined;
            return {
                ...item,
                fromStore: fromStore,
                toStore: toStore,
                creater: creater
            } as any
        });
        return{
            data:exs,
            currentPage:page,
            limit:limit,
            total:total
        }

    }


    async getExportNoteDetail(exportNoteId: number) {
        const db = await initORM();
        const exportNote = await db.exportNote.findOneOrFail({
            id: exportNoteId
        });
        const fromStore = await db.store.findOne({
            id: exportNote.fromStoreId
        })
        const toStore = await db.store.findOne({
            id: exportNote.toStoreId
        })
        const exportNoteDetails = await db.exportNoteDetail.find({
            exportNoteId: exportNoteId
        });
        const productIds = exportNoteDetails.map(item => item.productId);
        const products = await db.product.find({
            id: {$in: productIds}
        });
        const productMap = new Map(products.map(product => [product.id, product]));
        const exportNoteDetailWithProduct = exportNoteDetails.map(detail => {
            const product = productMap.get(detail.productId);
            return {
                ...detail,
                product,
                fromStore: fromStore,
                toStore: toStore || null
            }
        });
        return {
            exportNote,
            exportNoteDetailWithProduct
        } as any
    }
}

export default new Elysia().decorate("exportNoteService", new ExportNoteService())
