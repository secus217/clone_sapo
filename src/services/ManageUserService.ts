    import {initORM} from "../db";
    import {Elysia} from "elysia";
    import {QueryOrder, wrap} from "@mikro-orm/core";

    export class ManageUserService {
        async getAllUsers(page: number = 1, limit: number = 10, search?: string) {
            const db = await initORM();
            const offset = (page - 1) * limit;
            const options = {
                limit,
                offset,
                orderBy: {id: QueryOrder.ASC}
            }
            const where = search ? {username: {$like: `%${search}%`}} : {};
            const [users, total] = await db.user.findAndCount(where, options);
            const totalPages = Math.ceil(total / limit);
            return {
                data: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    role: user.role
                })),
                meta: {
                    currentPage: page,
                    itemsPerPage: limit,
                    totalItems: total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hastPreviousPage: page > 1
                }
            }

        }

        async getUserById(id: number) {
            const db = await initORM();
            const user = await db.user.findOne({
                id: id
            });
            if (!user) {
                throw new Error("User not found");
            }
            return {
                id: user.id,
                username: user.username,
                role: user.role
            }
        }

        async updateUser(id: number, data: { username?: string, role?: string }) {
            const db = await initORM();
            const user = await db.user.findOne({
                id: id
            })
            if (!user) {
                throw new Error("User not found");
            }
            wrap(user).assign({
                ...data
            })
            await db.em.flush()
            return {
                id: user.id,
                username: user.username,
                role: user.role
            }
        }

        async deleteUser(id: number) {
            const db = await initORM();
            const user = await db.user.findOne({
                id: id
            })
            if (!user) {
                throw new Error("User not found");
            }
            await db.em.removeAndFlush(user);
            return {
                message: "User deleted successfully"
            }
        }
    }

    export default new Elysia().decorate('manageUserService', new ManageUserService())