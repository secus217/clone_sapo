import {initORM} from "../db"
import {Elysia} from "elysia"
import {Orders, ExportNote, OrderDetail, ExportNoteDetail, ReceiptNote, Product, Inventory} from "../entities/index";
import {QueryOrder} from "@mikro-orm/core";

export class ReceiptNoteService {
    async createNewReceiptNote(userId:number,data: {
        storeId: number,
        totalAmount: number,
        paymentMethod:"cash" | "bank",
        note?:string,
        type: "THU" | "CHI",
    }) {
        try{
            const db=await initORM();
            const receiptNote=new ReceiptNote();
            receiptNote.storeId=data.storeId;
            receiptNote.createrId=userId;
            receiptNote.totalAmount=data.totalAmount;
            receiptNote.paymentMethod=data.paymentMethod;
            receiptNote.note=data.note;
            receiptNote.status="completed";
            receiptNote.type=data.type;
            db.em.persistAndFlush(receiptNote);
            return {
                receiptNote
            };
        }catch(error){
            return {
                error
            }
        }
    }
    async getAllReceiptNotes(storeId:number,page:number=1,limit:number=10) {
        const db=await initORM();
        const offset=(page-1)*limit;
        const options = {
            limit,
            offset,
            orderBy: {id: QueryOrder.ASC}
        };
        const where={storeId:storeId};
        const [receiptNote,total]=await db.receiptNote.findAndCount(where,options);
        const storeIds=receiptNote.map((item)=>item.storeId);
        const stores=await db.store.find({
            id:{$in:storeIds}
        })
        const storeMap=new Map(stores.map(item=>[item.id,item]));
        const totalPage=Math.ceil(total/limit);
        return{
            data:receiptNote.map((note:any)=>{
                const store=storeMap.get(note.storeId);
                return {
                    orderId:note.orderId,
                    storeId:note.storeId,
                    createrId:note.createrId,
                    totalAmount:note.totalAmount,
                    paymentMethod:note.paymentMethod,
                    note:note.note,
                    status:note.status,
                    type:note.type,
                    store
                }
            }),
            meta:{
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages: totalPage,
                hasNextPage: page < totalPage,
                hastPreviousPage: page > 1
            }
        }

    }
    async getAllReceiptNoteForAdmin(filter:{ storeId?:number },page:number=1,limit:number=10){
        const db=await initORM();
        const offset=(page-1)*limit;
        const where:any={};
        if(filter.storeId){
            where.storeId=filter.storeId;
        }
        const [receiptNotes,total]=await db.receiptNote.findAndCount(where,{
            limit,
            offset
        });
        const totalPages=Math.ceil(total/limit);
        return {
            data:receiptNotes,
            meta:{
                currentPage:page,
                itemsPerPage:limit,
                totalItems:total,
                totalPages:totalPages
            }
        }

    }

}

export default new Elysia().decorate("receiptNoteService", new ReceiptNoteService())
