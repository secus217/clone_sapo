import {initORM} from "../db"
import {Elysia} from "elysia"
import {QueryOrder, wrap} from "@mikro-orm/core";
import {Product} from "../entities";

export class ProductService {
    async getAllProducts(page: number = 1, limit: number = 10, search?: string, categoryId?: number) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const options = {
            limit,
            offset,
            orderBy: {id: QueryOrder.ASC},
            populate: ['category']
        };

        let where: any = {};
        if (search) {
            where.name = {$like: `%${search}%`};
        }
        if (categoryId) {
            where.category = categoryId;
        }

        const [products, total] = await db.product.findAndCount(where, options as any);
        const totalPages = Math.ceil(total / limit);

        return {
            data: products.map(product => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                retailPrice: product.retailPrice,
                importPrice: product.importPrice,
                category: product.category ? {
                    id: product.category.id,
                    name: product.category.name
                } : null,
                imageUrls: product.imageUrls ?? ""
            })),
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    }

    async getProductById(id: number) {
        const db = await initORM();
        const product = await db.product.findOne({id}, {populate: ['category']});
        if (!product) {
            return {
                success: false,
                message: 'Product not found!'
            }
        }
        return {
            success: true,
            data: {
                id: product.id,
                name: product.name,
                description: product.description,
                sku: product.sku,
                barcode: product.barcode,
                retailPrice: product.retailPrice,
                importPrice: product.importPrice,
                isActive: product.isActive,
                category: product.category ? {
                    id: product.category.id,
                    name: product.category.name
                } : null,
                imageUrls: product.imageUrls ?? ""

            }
        }
    }

    async createProduct(productData: {
        name: string,
        description: string,
        sku: string,
        barcode?: string,
        retailPrice: number,
        importPrice: number,
        isActive: boolean,
        categoryId?: number,
        imageUrls?:string
    }) {
        const db = await initORM();
        const product = new Product();
        wrap(product).assign({
            name: productData.name,
            description: productData.description,
            sku: productData.sku,
            barcode: productData.barcode,
            retailPrice: productData.retailPrice,
            importPrice: productData.importPrice,
            isActive: productData.isActive !== undefined ? productData.isActive : true,
            category:productData.categoryId,
            imageUrls:productData.imageUrls ?? ""
        });
        if (productData.categoryId) {
            const category = await db.category.findOne({id: productData.categoryId});
            if (category) {
                product.category = category;
            }
        }
        await db.em.persistAndFlush(product);
        return {
            success: true,
            data: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                retailPrice: product.retailPrice,
                importPrice: product.importPrice,
                isActive: product.isActive,
                category: product.category ? {
                    id: product.category.id,
                    name: product.category.name
                } : null,
                imageUrls: product.imageUrls ?? ""
            }
        }
    }
    async updateProduct(id: number, productData: {
        name?: string;
        description?: string;
        sku?: string;
        barcode?: string;
        retailPrice?: number;
        importPrice?: number;
        isActive?: boolean;
        categoryId?: number;
        imageUrls?:string;
    }) {
        const db = await initORM();
        const product = await db.product.findOne({ id });

        if (!product) {
            return { success: false, message: 'Không tìm thấy sản phẩm' };
        }

        wrap(product).assign({
            name: productData.name !== undefined ? productData.name : product.name,
            description: productData.description !== undefined ? productData.description : product.description,
            sku: productData.sku !== undefined ? productData.sku : product.sku,
            barcode: productData.barcode !== undefined ? productData.barcode : product.barcode,
            retailPrice: productData.retailPrice !== undefined ? productData.retailPrice : product.retailPrice,
            importPrice: productData.importPrice !== undefined ? productData.importPrice : product.importPrice,
            isActive: productData.isActive !== undefined ? productData.isActive : product.isActive,
            imageUrls: productData.imageUrls ?? ""
        });

        if (productData.categoryId) {
            const category = await db.category.findOne({ id: productData.categoryId });
            if (category) {
                product.category = category;
            }
        }

        await db.em.flush();

        return {
            success: true,
            data: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                retailPrice: product.retailPrice,
                importPrice: product.importPrice,
                isActive: product.isActive,
                category: product.category ? {
                    id: product.category.id,
                    name: product.category.name
                } : null,
                imageUrls: product.imageUrls ?? ""
            }
        };
    }
    async deleteProduct(id: number) {
        const db = await initORM();
        const product = await db.product.findOne({ id });

        if (!product) {
            return { success: false, message: 'Không tìm thấy sản phẩm' };
        }

        await db.em.removeAndFlush(product);

        return {
            success: true,
            message: 'Đã xóa sản phẩm thành công'
        };
    }

}

export default new Elysia().decorate("productService", new ProductService())