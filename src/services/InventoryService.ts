import {initORM} from "../db"
import {Elysia} from "elysia"
import {QueryOrder, wrap} from "@mikro-orm/core";
import {Inventory} from "../entities";

export class InventoryService {
    async getInventoryByProductId(productId: number) {
        const db = await initORM();
        const inventories = await db.inventory.find({product: productId}, {
            populate: ['product']
        });

        return {
            success: true,
            data: inventories.map(inv => {
                const product = inv.product.unwrap();
                return {
                    id: inv.id,
                    quantity: inv.quantity,
                    location: inv.location,
                    product: {
                        id: product.id,
                        name: product.name,
                        sku: product.sku
                    }
                };
            })
        };
    }

    async createInventory(inventoryData: {
        productId: number,
        quantity: number,
        location: string
    }) {
        const db = await initORM();
        const product = await db.product.findOne({id: inventoryData.productId});

        if (!product) {
            return {success: false, message: 'Sản phẩm không tồn tại'};
        }

        const inventory = new Inventory();
        wrap(inventory).assign({
            quantity: inventoryData.quantity,
            location: inventoryData.location,
            product: product
        });

        await db.em.persistAndFlush(inventory);

        return {
            success: true,
            data: {
                id: inventory.id,
                quantity: inventory.quantity,
                location: inventory.location,
                product: {
                    id: product.id,
                    name: product.name,
                    sku: product.sku
                }
            }
        };
    }

    async updateInventory(id: number, inventoryData: {
        quantity?: number,
        location?: string
    }) {
        const db = await initORM();
        const inventory = await db.inventory.findOne({id}, {populate: ['product']});


        if (!inventory) {
            return {success: false, message: 'Không tìm thấy thông tin kho'};
        }

        wrap(inventory).assign({
            quantity: inventoryData.quantity !== undefined ? inventoryData.quantity : inventory.quantity,
            location: inventoryData.location !== undefined ? inventoryData.location : inventory.location
        });

        await db.em.flush();
        const inventoryUnrwap=inventory.product.unwrap();

        return {
            success: true,
            data: {
                id: inventory.id,
                quantity: inventory.quantity,
                location: inventory.location,
                product: {
                    id: inventoryUnrwap.id,
                    name: inventoryUnrwap.name,
                    sku: inventoryUnrwap.sku
                }
            }
        };
    }

    async deleteInventory(id: number) {
        const db = await initORM();
        const inventory = await db.inventory.findOne({id});

        if (!inventory) {
            return {success: false, message: 'Không tìm thấy thông tin kho'};
        }

        await db.em.removeAndFlush(inventory);

        return {
            success: true,
            message: 'Đã xóa thông tin kho thành công'
        };
    }
}

export default new Elysia().decorate("inventoryService", new InventoryService())
