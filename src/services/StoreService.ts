import {initORM} from "../db";
import {Elysia} from "elysia";

import {Store, Product, Category, Inventory} from "../entities/index";

export class StoreService {
    async createStore(ownerId: number,storeData: {
        name: string,
        phoneNumber: string,
        email: string,
        address: string
    }) {
        const db = await initORM();
        const em = db.em.fork();
        const store = em.create(Store, {
            ownerId: ownerId,
            name: storeData.name,
            address: storeData.address,
            phoneNumber: storeData.phoneNumber,
            email: storeData.email
        })
        await db.em.persistAndFlush(store);
        return {
            store
        }
    }
    async getALlStores(userId: number) {
        const db=await initORM();
        const stores= await db.store.find({ownerId:userId});
        if (!stores) {
            throw new Error("Store not found");
        }
        return{
            stores
        }
    }
}

export default new Elysia().decorate("storeService", new StoreService());
