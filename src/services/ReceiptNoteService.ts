import {initORM} from "../db"
import {Elysia} from "elysia"
import {ReceiptNote} from "../entities/index";
import {QueryOrder} from "@mikro-orm/core";

export class ReceiptNoteService {
    async createNewReceiptNote(userId: number, data: {
        storeId: number,
        totalAmount: number,
        paymentMethod: "cash" | "bank",
        note?: string,
        type: "THU" | "CHI",
        object?: string,
        nameOfCustomer?: string,
        typeOfNote?: string,
    }) {
        try {
            const db = await initORM();
            const receiptNote = new ReceiptNote();
            receiptNote.storeId = data.storeId;
            receiptNote.createrId = userId;
            receiptNote.totalAmount = data.totalAmount;
            receiptNote.paymentMethod = data.paymentMethod;
            receiptNote.note = data.note;
            receiptNote.status = "completed";
            receiptNote.type = data.type;
            receiptNote.object = data.object;
            receiptNote.nameOfCustomer = data.nameOfCustomer;
            receiptNote.typeOfNote=data.typeOfNote;
            db.em.persistAndFlush(receiptNote);
            return {
                receiptNote
            };
        } catch (error) {
            return {
                error
            }
        }
    }

    async getAllReceiptNotes(storeId: number, page: number = 1, limit: number = 10) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const options = {
            limit,
            offset,
            orderBy: {id: QueryOrder.ASC}
        };
        const where = {storeId: storeId};
        const [receiptNote, total] = await db.receiptNote.findAndCount(where, options);
        const storeIds = receiptNote.map((item) => item.storeId);
        const stores = await db.store.find({
            id: {$in: storeIds}
        })
        const storeMap = new Map(stores.map(item => [item.id, item]));
        const totalPage = Math.ceil(total / limit);
        return {
            data: receiptNote.map((note: any) => {
                const store = storeMap.get(note.storeId);
                return {
                    createAt: note.createdAt,
                    orderId: note.orderId,
                    storeId: note.storeId,
                    createrId: note.createrId,
                    totalAmount: note.totalAmount,
                    paymentMethod: note.paymentMethod,
                    note: note.note,
                    status: note.status,
                    type: note.type,
                    store
                }
            }),
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages: totalPage,
                hasNextPage: page < totalPage,
                hastPreviousPage: page > 1
            }
        }

    }

    async getAllReceiptNoteForAdmin(filter: { storeId?: number }, page: number = 1, limit: number = 10) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const where: any = {};
        if (filter.storeId) {
            where.storeId = filter.storeId;
        }
        const [receiptNotes, total] = await db.receiptNote.findAndCount(where, {
            limit,
            offset
        });
        const totalPages = Math.ceil(total / limit);
        return {
            data: receiptNotes,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages: totalPages
            }
        }

    }

    async getAllReceiptNoteByOrderId(productId: number) {
        const db = await initORM();
        return await db.receiptNote.find({
            orderId: productId
        });

    }

    async getTongThu(){
        const db = await initORM();
        let tongThu=0;
        let tongChi=0;
        let tongTienMat=0;
        let tongTienBank=0;
        const receiptNotes = await db.receiptNote.findAll();
        const thu=receiptNotes.filter(note=>note.type === "THU");
        const chi=receiptNotes.filter(note=>note.type === "CHI");
        thu.map(item=>{
            tongThu+=item.totalAmount
        });
        chi.map(item=>{
            tongChi=item.totalAmount;
        });
        const tienmat=receiptNotes.filter(note=>note.paymentMethod === "cash");
        const bank=receiptNotes.filter(note=>note.paymentMethod === "bank");
        tienmat.map(item=>{
            tongTienMat+=item.totalAmount;
        })
        bank.map(item=>{
            tongTienBank+=item.totalAmount;
        })

        return{
            tongThu:tongThu,
            tongChi:tongChi,
            tienmat:tongTienMat,
            bank:tongTienBank
        }

    }

}

export default new Elysia().decorate("receiptNoteService", new ReceiptNoteService())
