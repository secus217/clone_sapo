import {initORM} from "../db";
import {Elysia} from "elysia";
import Product from "../entities/Product";
import Category from "../entities/Category";
import Inventory from "../entities/Inventory";

export class ProductService {
    async createProduct(data: {
        name: string;
        description?: string;
        sku: string;
        retailPrice: number;
        importPrice: number;
        isActive?: boolean;
        categoryId?: number;
        imageUrls?: string;
        initialStoreId: number;
        initialQuantity: number;
    }) {
        const db = await initORM();
        const em = db.em.fork();
        try {
            await em.begin();
            const existingSku = await em.findOne(Product, {sku: data.sku});
            if (existingSku) {
                throw new Error(`Product with SKU ${data.sku} already exists`);
            }
            let category;
            if (data.categoryId) {
                category = await em.findOne(Category, {id: data.categoryId});
                if (!category) {
                    throw new Error(`Category with ID ${data.categoryId} not found`);
                }
            }

            const newProduct = em.create(Product, {
                name: data.name,
                description: data.description,
                sku: data.sku,
                retailPrice: data.retailPrice,
                importPrice: data.importPrice,
                isActive: data.isActive ?? true,
                category: category,
                imageUrls: data.imageUrls
            });
            await em.persistAndFlush(newProduct);
            const initialInventory = em.create(Inventory, {
                storeId: data.initialStoreId,
                productId: newProduct.id,
                quantity: data.initialQuantity
            });
            await em.persistAndFlush(initialInventory);
            await em.commit();
            return {
                product: newProduct,
                initialInventory: initialInventory
            };
        } catch (error: any) {
            await em.rollback();
            throw new Error(`Failed to create product: ${error.message}`);
        } finally {
            em.clear();
        }
    }

    async updateProduct(productId: number, data: {
        name?: string;
        description?: string;
        sku?: string;
        barcode?: string;
        retailPrice?: number;
        importPrice?: number;
        isActive?: boolean;
        categoryId?: number;
        imageUrls?: string;
    }) {
        const db = await initORM();
        const em = db.em.fork();

        try {
            await em.begin();
            const product = await em.findOne(Product, {id: productId});
            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }
            if (data.sku && data.sku !== product.sku) {
                const existingSku = await em.findOne(Product, {sku: data.sku});
                if (existingSku) {
                    throw new Error(`Product with SKU ${data.sku} already exists`);
                }
                product.sku = data.sku;
            }
            if (data.categoryId) {
                const category = await em.findOne(Category, {id: data.categoryId});
                if (!category) {
                    throw new Error(`Category with ID ${data.categoryId} not found`);
                }
                product.category = category;
            }
            if (data.name !== undefined) product.name = data.name;
            if (data.description !== undefined) product.description = data.description;
            if (data.retailPrice !== undefined) {
                if (data.retailPrice < 0) {
                    throw new Error("Retail price must be non-negative");
                }
                product.retailPrice = data.retailPrice;
            }
            if (data.importPrice !== undefined) {
                if (data.importPrice < 0) {
                    throw new Error("Import price must be non-negative");
                }
                product.importPrice = data.importPrice;
            }
            if (data.isActive !== undefined) product.isActive = data.isActive;
            if (data.imageUrls !== undefined) product.imageUrls = data.imageUrls;
            await em.persistAndFlush(product);

            await em.commit();
            return await em.findOne(Product, {id: productId}, {populate: ['category']});
        } catch (error: any) {
            await em.rollback();
            throw new Error(`Failed to update product: ${error.message}`);
        } finally {
            em.clear();
        }
    }

    async deleteProduct(productId: number) {
        const db = await initORM();
        const em = db.em.fork();
        try {
            await em.begin();
            const product = await db.product.findOne({id: productId});
            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }
            const inventory = db.inventory.find({productId: productId});
            await em.nativeDelete(Inventory, {productId: productId});
            await em.removeAndFlush(product);
            await em.commit();
            return {
                message: "Successfully deleted",
            }

        } catch (e: any) {
            throw new Error(e.message);
        } finally {
            em.clear();
        }
    }

    async getAllProductsByStoreId(storeId?: number, search?: string) {
        const db = await initORM();
        let inventories: any = [];
        try {
            inventories = await db.inventory.find({});
            const productIds = inventories.map((item: any) => item.productId);
            const storeIds = inventories.map((item: any) => item.storeId);
            const products = await db.product.find({id: {$in: productIds}});
            const stores = await db.store.find({id: {$in: storeIds}});
            const productsMap = new Map(products.map((item: any) => [item.id, item]));
            const storeMap = new Map(stores.map(item => [item.id, item]));
            inventories = inventories.map((item: any) => {
                const store = storeMap.get(item.storeId);
                const product = productsMap.get(item.productId);
                return {
                    ...item,
                    store: store,
                    product: product,
                }
            })
            if(storeId){
                inventories=inventories.filter((item: any) => item.storeId === storeId);
            }
            return inventories;
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    async getAllProductForAdmin(page: number = 1, limit: number = 10) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const [products, total] = await db.product.findAndCount({}, {
            limit,
            offset,
            populate: ["category"]
        });
        const totalPage = Math.ceil(total / limit);
        return {
            data: products,
            page,
            limit,
            totalPage
        }
    }

}

export default new Elysia().decorate("productService", new ProductService());
