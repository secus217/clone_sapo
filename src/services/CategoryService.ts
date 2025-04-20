import {initORM} from "../db"
import {Elysia} from "elysia"
import {QueryOrder, wrap} from "@mikro-orm/core";
import {Category} from "../entities";

export class CategoryService {
    async getAllCategories(page: number = 1, limit: number = 10, search?: string) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const options = {
            limit,
            offset,
            orderBy: {id: QueryOrder.ASC}
        };

        let where: any = {};
        if (search) {
            where.name = {$like: `%${search}%`};
        }
        console.log("thanh")

        const [categories, total] = await db.category.findAndCount(where, options as any);
        const totalPages = Math.ceil(total / limit);

        return {
            data: categories.map(category => ({
                id: category.id,
                name: category.name,
                description: category.description
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

    async getCategoryById(id: number) {
        const db = await initORM();
        const category = await db.category.findOne({id});
        if (!category) {
            return {
                success: false,
                message: 'Category not found!'
            }
        }
        return {
            success: true,
            data: {
                id: category.id,
                name: category.name,
                description: category.description
            }
        }
    }

    async createCategory(categoryData: {
        name: string,
        description?: string
    }) {
        const db = await initORM();
        const category = new Category();
        wrap(category).assign({
            name: categoryData.name,
            description: categoryData.description || ''
        });
        await db.em.persistAndFlush(category);
        return {
            success: true,
            data: {
                id: category.id,
                name: category.name,
                description: category.description
            }
        }
    }

    async updateCategory(id: number, categoryData: {
        name?: string;
        description?: string;
    }) {
        const db = await initORM();
        const category = await db.category.findOne({id});

        if (!category) {
            return {success: false, message: 'Không tìm thấy danh mục'};
        }

        wrap(category).assign({
            name: categoryData.name !== undefined ? categoryData.name : category.name,
            description: categoryData.description !== undefined ? categoryData.description : category.description
        });

        await db.em.flush();

        return {
            success: true,
            data: {
                id: category.id,
                name: category.name,
                description: category.description
            }
        };
    }

    async deleteCategory(id: number) {
        const db = await initORM();
        const category = await db.category.findOne({id});

        if (!category) {
            return {success: false, message: 'Không tìm thấy danh mục'};
        }

        const productCount = await db.product.count({category: id});
        if (productCount > 0) {
            return {
                success: false,
                message: 'Không thể xóa danh mục này vì có sản phẩm đang sử dụng'
            };
        }

        await db.em.removeAndFlush(category);

        return {
            success: true,
            message: 'Đã xóa danh mục thành công'
        };
    }
}

export default new Elysia().decorate("categoryService", new CategoryService())
