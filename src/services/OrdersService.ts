import {initORM} from "../db"
import {Elysia} from "elysia"
import {ExportNote, ExportNoteDetail, OrderDetail, Orders, ReceiptNote} from "../entities/index";
import * as wasi from "node:wasi";
import {QueryOrder} from "@mikro-orm/core";

export class OrdersService {
    async createOrder(data: {
                          fromStoreId: number, paymentMethod: 'cash' | 'bank',
                          items: Array<{
                              productId: number;
                              quantity: number;
                              unitPrice: number;
                          }>,
                          customerId?: number,
                          paymentStatus: 'pending' | 'paid',

                      }, createrId: number
    ) {
        const db = await initORM();
        const em = db.em.fork();

        try {
            await em.begin();
            for (const product of data.items) {
                const inventory = await db.inventory.findOneOrFail({
                    storeId: data.fromStoreId,
                    productId: product.productId
                });
                if (!inventory) {
                    throw new Error(`Inventory not found for product ${product.productId} in store`);
                }
                if (inventory.quantity < product.quantity) {
                    throw new Error("Insufficient inventory for product")
                }
                inventory.quantity -= product.quantity;
                em.persist(inventory);
            }

            const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            const order = em.create(Orders, {
                storeId: data.fromStoreId,
                createrId: createrId,
                quantity: totalQuantity,
                totalAmount: totalAmount,
                paymentMethod: data.paymentMethod,
                orderStatus: "pending",
                shippingStatus: "processing",
                customerId: data.customerId,
                paymentStatus: data.paymentStatus,
            });

            await em.flush();

            const orderDetails = data.items.map(item =>
                em.create(OrderDetail, {
                    order: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice
                })
            );

            const exportNote = em.create(ExportNote, {
                orderId: order.id,
                fromStoreId: data.fromStoreId,
                createrId: createrId,
                toStoreId: null,
                totalQuantity: totalQuantity,
                status: "completed",
                type:"xuat"
            });

            await em.flush();

            const exportNoteDetails = data.items.map(item =>
                em.create(ExportNoteDetail, {
                    exportNoteId: exportNote.id,
                    productId: item.productId,
                    quantity: item.quantity
                })
            );

            const receiptNote = em.create(ReceiptNote, {
                orderId: order.id,
                storeId: data.fromStoreId,
                createrId: createrId,
                totalAmount: totalAmount,
                paymentMethod: data.paymentMethod,
                status: "completed",
                type: "THU"
            });


            await em.persistAndFlush([
                order,
                ...orderDetails,
                exportNote,
                ...exportNoteDetails,
                receiptNote
            ]);

            // Commit transaction
            await em.commit();

            return {
                order,
                orderDetails,
                exportNote,
                exportNoteDetails,
                receiptNote
            };
        } catch (e: any) {
            await em.rollback();
            throw new Error(e.message);
        } finally {
            em.clear();
        }
    }


    async getOrderDetail(orderId: number) {
        const db = await initORM();
        const order = await db.orders.findOneOrFail({id: orderId}, {populate: ["orderDetails"]});
        const customer = await db.user.findOneOrFail({
            id: order.customerId,
        }, {
            fields: ["id", "username", "address", "phone", "role", "createdAt", "updatedAt"]
        })
        const creater = await db.user.findOneOrFail({
                id: order.createrId
            },
            {
                fields: ["id", "username", "address", "phone", "role", "createdAt", "updatedAt"]
            }
        );
        if (order.orderDetails) {
            const productIds = order.orderDetails.map(item => item.productId);
            const products = await db.product.find({
                id: {$in: productIds}
            })
            const productMap = new Map(products.map(product => [product.id, product]));
            const orderDetailsWithProducts = order.orderDetails.map(({order, ...detail}) => {
                const product = productMap.get(detail.productId);
                return {
                    ...detail,
                    product: product || null
                };
            });
            const {orderDetails, ...orderWithoutDetails} = order;

            return {
                order: {
                    ...orderWithoutDetails,
                    orderDetails: orderDetailsWithProducts,
                    customer: customer,
                    creater: creater
                } as any
            }
        }
        return {
            data: []
        }
    }

    async updateOrderStatus(orderId: number,
                            status: "completed" | "cancelled" | 'pending',
                            paymentStatus?: "paid" | "cancelled") {
        const db = await initORM();
        const order = await db.orders.findOne({id: orderId});
        if (!order) {
            throw new Error("Order not found");
        }
        order.orderStatus = status;
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }
        await db.em.persistAndFlush(order);
        return {
            order
        }
    }

    async updateShippingStatus(orderId: number, status: "processing" | "completed" | 'cancelled') {
        const db = await initORM();
        const order = await db.orders.findOne({id: orderId});
        if (!order) {
            throw new Error("Order not found");
        }
        order.shippingStatus = status;
        await db.em.persistAndFlush(order);
        return {
            order
        }
    }

    async deleteOrder(orderId: number) {
        const db = await initORM();
        try {
            const order = await db.orders.findOneOrFail({id: orderId});
            order.isDeleted = true;
            await db.em.persistAndFlush(order);
            return {
                success: true,
                message: `Order with ID ${orderId} has been deleted successfully.`,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Error deleting order: ${error.message}`,
            };
        }
    }

    async getOrderByProductId(page: number = 1, limit: number = 1, productId: number) {
        try {
            const db = await initORM();
            const offset = (page - 1) * limit;
            const options = {
                limit,
                offset,
                orderBy: {id: QueryOrder.ASC}
            }
            const [order, total] = await db.orders.findAndCount({
                    orderDetails: {
                        productId: productId
                    },
                },
                options
            );
            const totalPages = Math.ceil(total / limit);
            return {
                data: order,
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hastPreviousPage: page > 1
            }
        } catch (e: any) {
            throw new Error(e.message);
        }


    }

    async getOrderByCustomerId(page: number = 1, limit: number = 1, customerId: number) {
        try {
            const db = await initORM();
            const offset = (page - 1) * limit;
            const [order, total] = await db.orders.findAndCount({
                    customerId: customerId,
                },
                {
                    limit,
                    offset,
                    orderBy: {id: QueryOrder.ASC},
                    populate: ['orderDetails']
                },
            );
            const totalPages = Math.ceil(total / limit);
            return {
                data: order,
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hastPreviousPage: page > 1
            }
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    async getAllOrder(page: number = 1, limit: number = 10, filters: {
        productId?: number,
        storeId?: number
    } = {}) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const where: any = {};
        if (filters.productId) {
            where.orderDetails = {
                productId: filters.productId
            }
        }
        if (filters.storeId) {
            where.storeId = filters.storeId;
        }

        try {
            const [order, total] = await db.orders.findAndCount(where, {
                limit,
                offset,
                orderBy: {id: QueryOrder.ASC},
                populate: ["orderDetails"]
            })
            const storeIds = order.map(item => item.storeId);
            const stores = await db.store.find({
                id: {$in: storeIds},
            });
            const storeMap = new Map(stores.map(store => [store.id, store]));
            const orderWithStore = order.map(order => {
                const storeInfo = storeMap.get(order.storeId);
                return {
                    ...order,
                    storeInfo
                }
            })
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: orderWithStore,
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                hasNextPage: page < totalPages
            } as any
        } catch (e: any) {
            throw new Error(e.message);
        }

    }

    async updateOrder(orderId: number, data: {
        storeId?: number,
        createrId?: number,
        quantity?: number,
        totalAmount?: number,
        paymentMethod?: 'cash' | 'bank',
        paymentStatus?: 'pending' | 'paid',
        orderStatus?: 'completed' | 'cancelled' | 'pending',
        shippingStatus?: 'processing' | 'completed' | 'cancelled',
        customerId?: number
    }) {
        const db = await initORM();
        try {
            const order = await db.orders.findOneOrFail({id: orderId});

            if (data.storeId !== undefined) order.storeId = data.storeId;
            if (data.createrId !== undefined) order.createrId = data.createrId;
            if (data.quantity !== undefined) order.quantity = data.quantity;
            if (data.totalAmount !== undefined) order.totalAmount = data.totalAmount;
            if (data.paymentMethod) order.paymentMethod = data.paymentMethod;
            if (data.paymentStatus) order.paymentStatus = data.paymentStatus;
            if (data.orderStatus) order.orderStatus = data.orderStatus;
            if (data.shippingStatus) order.shippingStatus = data.shippingStatus;
            if (data.customerId !== undefined) order.customerId = data.customerId;
            await db.em.persistAndFlush(order);
            return {
                success: true,
                message: 'Order updated successfully',
                order,
            };
        } catch (error: any) {
            throw new Error(`Error updating order: ${error.message}`);
        } finally {
            db.em.clear();
        }
    }

}

export default new Elysia().decorate("ordersService", new OrdersService())
