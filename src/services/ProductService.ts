import {initORM} from "../db";
import {Elysia} from "elysia";
import Product from "../entities/Product";
import Category from "../entities/Category";
import Inventory from "../entities/Inventory";
import {ExportNote, ReceiptNote} from "../entities";

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
            await em.commit();
            return {
                product: newProduct
            };
        } catch (error: any) {
            await em.rollback();
            throw new Error(`Failed to create product: ${error.message}`);
        } finally {
            em.clear();
        }
    }
    async provideProductToInventory(userId:number,storeId: number,productId: number,quantity: number) {
    const db = await initORM();
    const inven:any=await db.inventory.findOne({
        storeId:storeId,
        productId:productId,
    });
    if(!inven) {
        const newInventory=new Inventory();
        newInventory.productId = productId;
        newInventory.quantity = quantity;
        newInventory.storeId = storeId;
        await db.em.persistAndFlush(newInventory);
        const newExportNote=new ExportNote();
        newExportNote.toStoreId=storeId;
        newExportNote.createrId=userId;
        newExportNote.totalQuantity=quantity;
        newExportNote.status='completed';
        newExportNote.note="Tự động tạo cùng việc cung cấp hàng tới kho"
        newExportNote.type='nhap';
        await db.em.persistAndFlush(newExportNote);
        return {
            success: true
        };
    } else{
        inven.quantity += quantity;
        await db.em.persistAndFlush(inven);
        return {
            success: true
        }
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
            return {
                success: true
            };
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
            const products = await db.product.find({id: {$in: productIds}},{
                populate:["category"]
            });
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
            if (storeId) {
                inventories = inventories.filter((item: any) => item.storeId === storeId);
            }
            if(search) {
                inventories= inventories.filter((item: any) => item.productId == search||item.product.name.includes(search));
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
            totalPage,
            total:total
        }
    }

    async getTopProduct(date: string) {
        const db = await initORM();

        // Chuyển đổi chuỗi ngày thành đối tượng Date
        const selectedDate = new Date(date);
        const currentDate = new Date(); // Ngày hiện tại

        // Lấy các đơn hàng trong ngày được chọn
        const orders = await db.orders.findAll({
            where: {
                createdAt: {
                    $gte: selectedDate,
                    $lte: currentDate
                }
            }
        });

        // Lấy orderIds từ các đơn hàng trong ngày
        const orderIds = orders.map((order:any) => order.id);

        // Lấy chi tiết đơn hàng chỉ cho các đơn hàng trong ngày đó
        const orderDetails = await db.orderDetail.findAll({
            where: {
                order: {id:{$in: orderIds}}
            }
        });

        const quantityMap: any = {};
        orderDetails.forEach(orderDetail => {
            if (!quantityMap[orderDetail.productId]) {
                quantityMap[orderDetail.productId] = 0;
            }
            quantityMap[orderDetail.productId] += orderDetail.quantity;
        });

        const sortedProductIds = Object.entries(quantityMap)
            .sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

        const topProductsIds: any[] = sortedProductIds.map(item => item[0]);

        const products = await db.product.find({
            id: {$in: topProductsIds}
        });

        return topProductsIds.map(id => {
            const product: any = products.find(item => item.id == id);
            const quantity = quantityMap[id];
            return {
                ...product,
                quantity
            }
        });
    }
    async nearOrder(){
        const db = await initORM();
        return db.orders.find({}, {
            limit: 6,
            orderBy: {createdAt: "DESC"}
        });

    }

}

export default new Elysia().decorate("productService", new ProductService());
