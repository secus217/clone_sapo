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
                          customerId: number,
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
                orderDetails:[]
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
                receiptNote
            ]);

            // Commit transaction
            await em.commit();

            return {
                order,
                orderDetails,
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
            const [orders, total] = await db.orders.findAndCount({
                    customerId: customerId,
                },
                {
                    limit,
                    offset,
                    orderBy: {id: QueryOrder.ASC},
                    populate: ['orderDetails']
                },
            );
            const productIds=orders.flatMap((order:any) =>order.orderDetails.map((detail:any)=>detail.productId));
            const products=await db.product.find({
                id:{$in:productIds}
            })
            let totalExpire=0;
            const productMap=new Map(products.map(product=>[product.id,product]));
            const ordersWithProduct=orders.map((order:any)=>{
                totalExpire+=order.totalAmount;
                const orderWithProduct={...order};
                orderWithProduct.orderDetails=order.orderDetails.map((detail:any)=>{
                    const { order: _, ...detailWithoutOrder } = detail;
                    return{
                        ...detailWithoutOrder,
                        product:productMap.get(detail.productId)||null,
                    }
                });
                return orderWithProduct;
            })
            const totalPages = Math.ceil(total / limit);
            return {
                data: ordersWithProduct,
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hastPreviousPage: page > 1,
                totalExpire:totalExpire
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
            const createrIds = order.map(item => item.createrId);
            const customerIds = order.map(item => item.customerId);
            const creaters = await db.user.find({
                id: {$in: createrIds},
            });
            const customers = await db.user.find({
                id: {$in: customerIds},
            })

            const createrMap = new Map(creaters.map(creater => [creater.id, creater]));
            const customerMap = new Map(customers.map(customer => [customer.id, customer]));
            const storeMap = new Map(stores.map(store => [store.id, store]));
            const orderWithStore = order.map(order => {
                const createrOrder = createrMap.get(order.createrId);
                const customerOrder = customerMap.get(order.customerId);
                const storeInfo = storeMap.get(order.storeId);

                return {
                    ...order,
                    storeInfo,
                    creater: createrOrder,
                    customerOrder: customerOrder,
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
    async getAllRevenue(){
        const db = await initORM();
        let revenues=0;
        const orders=await db.orders.find({
            paymentStatus:"paid"
        });
        orders.map(order => {
            revenues+=order.totalAmount;
        });
        return revenues;
    }

    async getAllNewOrder(){
        const db = await initORM();
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const [orders,count]=await db.orders.findAndCount({
            createdAt:{
                $gte:oneDayAgo
            }
        });
        return {
            count
        }
    }
    async getPendingOrder(){
        const db = await initORM();
        const [orders,count]=await db.orders.findAndCount({
          orderStatus:"pending"
        });
        return {
            count
        }
    }
    async getCanncelOrder(){
        const db = await initORM();
        const [orders,count]=await db.orders.findAndCount({
            isDeleted:true
        });
        return {
            count
        }
    }
    async getAllRevenueByTime(days = 7, storeId?: number) {
        const db = await initORM();
        const revenuesByDay = [];
        for (let i = 0; i < days; i++) {
            // Tính ngày hiện tại
            const today = new Date();
            const currentDate = new Date(Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate() - (days - 1 - i)
            ));
            const nextDate = new Date(currentDate);
            nextDate.setUTCDate(currentDate.getUTCDate() + 1);

            // Tạo điều kiện query động
            const whereCondition: any = {
                shippingStatus: "completed",
                createdAt: {
                    $gte: currentDate,
                    $lt: nextDate,
                }
            };

            if (storeId !== undefined) {
                whereCondition.storeId = storeId;
            }

            // Truy vấn các đơn hàng trong ngày
            const orders = await db.orders.find(whereCondition);

            // Tính tổng doanh thu trong ngày
            let dailyRevenue = 0;
            orders.forEach(order => {
                dailyRevenue += order.totalAmount;
            });


            revenuesByDay.push({
                date: currentDate.toISOString().split("T")[0],
                revenue: dailyRevenue,
            });
        }
        return revenuesByDay;
    }


}

export default new Elysia().decorate("ordersService", new OrdersService())
