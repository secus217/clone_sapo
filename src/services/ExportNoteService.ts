import {initORM, Services} from "../db"
import {Elysia} from "elysia"
import {ExportNote, ExportNoteDetail} from "../entities/index";
import {QueryOrder} from "@mikro-orm/core";

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
    async updateInventoryForImport(db:Services,exportNote: ExportNote,exportDetails: ExportNoteDetail[]) {
        const productIds=exportDetails.map(product => product.productId);
        const existInventories = await db.inventory.find({
            storeId:exportNote.toStoreId,
            productId:{$in:productIds}
        });
        const inventoryMap = new Map(existInventories.map(inv=>[inv.productId,inv]));
        const inventoryUpdates=exportDetails.map(item=>{
            let inventory=inventoryMap.get(item.productId);
            if(!inventory){
                inventory=db.inventory.create({
                    storeId:exportNote.toStoreId,
                    productId:item.productId,
                    quantity:item.quantity,
                });
            } else{
                inventory.quantity+=item.quantity;
            }
            return inventory;
        })
        await db.em.persistAndFlush(inventoryUpdates);
    }
    async aprroveImportNote(userId:number, data: {
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
        return{
            newImportNote
        }
    }
    async getListExportNote(page:number=1,limit:number=10,filter:{
        storeId?:number
    }) {
        const db=await initORM();
        const offset:number = (page-1)*limit;
        const where:any={};
        if(filter.storeId){
            where.storeId=filter.storeId;
        }
        return await db.exportNote.find(where, {
            limit,
            offset,
            orderBy: {id: QueryOrder.ASC}
        });
    }
    async getExportNoteDetail(exportNoteId:number) {
        const db=await initORM();
        const exportNote=db.exportNote.findOneOrFail({
            id:exportNoteId
        });
        const exportNoteDetails=await db.exportNoteDetail.find({
            exportNoteId: exportNoteId
        });
        const productIds=exportNoteDetails.map(item=>item.productId);
        const products=await db.product.find({
            id:{$in:productIds}
        });
        const productMap=new Map(products.map(product=>[product.id,product]));
        const exportNoteDetailWithProduct=exportNoteDetails.map(detail=>{
            const product=productMap.get(detail.productId);
            return{
                ...detail,
                product
            }
        });
        return{
            exportNote,
            exportNoteDetailWithProduct
        } as any
    }
}

export default new Elysia().decorate("exportNoteService", new ExportNoteService())
