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
    async getAllStoresOfAdmin() {
        const db=await initORM();
        const stores=await db.store.findAll();
        return{
            stores
        }
    }
    async getStoreDetails(storeId: number) {
        const db = await initORM();
        const store = await db.store.findOneOrFail({ id: storeId });
        const inventories = await db.inventory.find({
            storeId: storeId
        });
        const productIds = inventories.map(inventory => inventory.productId);
        const products = await db.product.find({
            id: { $in: productIds }
        });

        const productMap = new Map();
        products.forEach(product => {
            productMap.set(product.id, product);
        });

        const inventoriesWithProductDetails = inventories.map(inventory => {
            const product = productMap.get(inventory.productId);
            return {
                ...inventory,
                product: product
            };
        });

        return {
            store,
            inventories: inventoriesWithProductDetails
        }as any;
    }
}

export default new Elysia().decorate("storeService", new StoreService());
