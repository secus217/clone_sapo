import {initORM} from "../db"
import {Elysia} from "elysia"
import {OrderDetail, Orders, PaymentOrder, ReceiptNote} from "../entities/index";
import {QueryOrder} from "@mikro-orm/core";
import {ExportNote, ExportNoteDetail, Store} from "../entities";

export class OrdersService {


    async createOrder(data: {
                          fromStoreId: number,
                          items: Array<{
                              productId: number;
                              quantity: number;
                              unitPrice: number;
                          }>,
                          customerId: number,
                          discount?: number,
                          paymentData: Array<
                              {
                                  amount: number,
                                  paymentMethod: 'cash' | 'bank',
                              }
                          >

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
            const totalAmountAfterDiscount = totalAmount * (100 - (data?.discount as any)) / 100;
            const payedAmount = data.paymentData.reduce((total, item) => total + item.amount, 0);
            const order = em.create(Orders, {
                storeId: data.fromStoreId,
                createrId: createrId,
                quantity: totalQuantity,
                totalAmount: totalAmountAfterDiscount,
                orderStatus: payedAmount === totalAmountAfterDiscount ? "completed" : "pending",
                discount: data.discount,
                shippingStatus: "processing",
                customerId: data.customerId,
                paymentStatus: payedAmount === totalAmountAfterDiscount ? "paid" : "pending",
                orderDetails: [],
                remainAmount: totalAmountAfterDiscount - payedAmount
            });
            const exportNote = em.create(ExportNote, {
                orderId: order.id,
                fromStoreId: data.fromStoreId,
                toStoreId: null,
                createrId: createrId,
                totalQuantity: totalQuantity,
                status: "completed",
                note: "",
                type: "xuat"
            });
            const NoteTien: any = await db.tongThuTongChi.findOne({
                id: 1
            });


            await em.flush();
            const paymentOrders = data.paymentData.map((item) => {
                NoteTien.TongThu += item.amount;
                if (item.paymentMethod === 'cash') {
                    NoteTien.QuyTienMat += item.amount;
                } else {
                    NoteTien.QuyBank += item.amount;
                }
                return em.create(PaymentOrder, {
                    orderId: order.id,
                    amount: item.amount,
                    paymentMethod: item.paymentMethod
                });
            });

            const orderDetails = data.items.map(item =>
                em.create(OrderDetail, {
                    order: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice
                })
            );
            const exportNoteDetail = data.items.map(item =>
                em.create(ExportNoteDetail, {
                    exportNoteId: exportNote.id,
                    productId: item.productId,
                    quantity: item.quantity
                })
            );
            const customer = await db.user.findOneOrFail({
                id: data.customerId
            })


            data.paymentData.forEach((item) => {
                em.create(ReceiptNote, {
                    orderId: order.id,
                    storeId: data.fromStoreId,
                    createrId: createrId,
                    totalAmount: item.amount,
                    paymentMethod: item.paymentMethod,
                    status: "completed",
                    type: "THU",
                    object: "customer",
                    nameOfCustomer: customer.username,
                    typeOfNote: "auto"
                });
            })


            await em.persistAndFlush([
                order,
                ...orderDetails,
                NoteTien,
                ...exportNoteDetail
            ]);
            this.savePaymentOrders(paymentOrders, db);
            // Commit transaction
            await em.commit();

            return {
                order,
                orderDetails
            };
        } catch (e: any) {
            await em.rollback();
            throw new Error(e.message);
        } finally {
            em.clear();
        }
    }

    async savePaymentOrders(paymentOrders: any, db: any) {
        // Persist từng entity trong mảng
        for (const paymentOrder of paymentOrders) {
            await db.em.persist(paymentOrder);
        }
        // Flush tất cả các thay đổi vào database
        await db.em.flush();
    }

    async addNewPayment(orderId: number, paymentData: Array<{
        amount: number,
        paymentMethod: 'cash' | 'bank'
    }>) {
        const db = await initORM();
        const em = db.em.fork();
        const order = await db.orders.findOneOrFail({
            id: orderId
        });
        const customer = await db.user.findOne({
            id: order.customerId
        })
        const NoteTien: any = await db.tongThuTongChi.findOne({
            id: 1
        });
        if (order) {
            paymentData.map(item => {
                NoteTien.TongThu += item.amount;
                if (item.paymentMethod === 'cash') {
                    NoteTien.QuyTienMat += item.amount;
                } else {
                    NoteTien.QuyBank += item.amount;
                }
                const payment = new PaymentOrder();
                payment.orderId = order.id;
                payment.paymentMethod = item.paymentMethod;
                payment.amount = item.amount;
                return db.em.persist(payment);
            })
            paymentData.forEach(item => {
                em.create(ReceiptNote, {
                    orderId: order.id,
                    storeId: order.storeId,
                    createrId: order.createrId,
                    totalAmount: item.amount,
                    paymentMethod: item.paymentMethod,
                    status: "completed",
                    type: "THU",
                    object: "customer",
                    nameOfCustomer: customer?.username || "",
                    typeOfNote: "auto"
                });
            })
        }
        await db.em.flush();
        return {
            success: true
        }

    }

    async updateRemainAmount(orderId: number) {
        const db = await initORM();
        const order = await db.orders.findOneOrFail({
            id: orderId
        })
        order.remainAmount = 0;
        order.paymentStatus = 'paid';
        order.orderStatus = 'completed';
        await db.em.persistAndFlush(order);
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
            const NoteTien: any = await db.tongThuTongChi.findOne({
                id: 1
            });
            const order = await db.orders.findOneOrFail({id: orderId});
            const orderdetails = await db.orderDetail.find({
                order: {id: orderId}
            })
            order.isDeleted = true;
            const inventorys = await db.inventory.find({
                storeId: order.storeId
            })
            orderdetails.map(async (detail: any) => {
                const inventory: any = inventorys.find(item => item.productId == detail.productId);
                inventory.quantity += detail.quantity;
                await db.em.persistAndFlush(inventory);
            })
            await db.em.persistAndFlush(order);
            const receiptNotes = await db.receiptNote.find({
                orderId: orderId
            });
            if (receiptNotes) {
                receiptNotes.forEach(receiptNote => {
                    receiptNote.status = "cancelled";
                    NoteTien.TongThu -= receiptNote.totalAmount;
                })
            }
            const exportNote = await db.exportNote.findOne({
                orderId: orderId
            })
            if (exportNote) {
                exportNote.status = "cancelled";
                await db.em.persistAndFlush(exportNote);
            }
            await db.em.persistAndFlush(receiptNotes);
            await db.em.persistAndFlush(NoteTien);

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
            const productIds = orders.flatMap((order: any) => order.orderDetails.map((detail: any) => detail.productId));
            const products = await db.product.find({
                id: {$in: productIds}
            })
            let totalExpire = 0;
            const productMap = new Map(products.map(product => [product.id, product]));
            const ordersWithProduct = orders.map((order: any) => {
                totalExpire += order.totalAmount;
                const orderWithProduct = {...order};
                orderWithProduct.orderDetails = order.orderDetails.map((detail: any) => {
                    const {order: _, ...detailWithoutOrder} = detail;
                    return {
                        ...detailWithoutOrder,
                        product: productMap.get(detail.productId) || null,
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
                totalExpire: totalExpire
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
            const paymentOfOrders = await db.paymentOrder.findAll();
            const paymentMaps = new Map<number, any[]>();
            paymentOfOrders.forEach(item => {
                if (!paymentMaps.has(item.orderId)) {
                    paymentMaps.set(item.orderId, []);
                }
                paymentMaps.get(item.orderId)?.push(item);
            });

            const createrMap = new Map(creaters.map(creater => [creater.id, creater]));
            const customerMap = new Map(customers.map(customer => [customer.id, customer]));
            const storeMap = new Map(stores.map(store => [store.id, store]));
            const orderWithStore = order.map(order => {
                const createrOrder = createrMap.get(order.createrId);
                const customerOrder = customerMap.get(order.customerId);
                const storeInfo = storeMap.get(order.storeId);
                const paymentArrays = paymentMaps.get(order.id);

                return {
                    ...order,
                    storeInfo,
                    creater: createrOrder,
                    customerOrder: customerOrder,
                    paymentArrays: paymentArrays
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


    async getAllRevenue() {
        const db = await initORM();
        let revenues = 0;
        const orders = await db.orders.find({
            paymentStatus: "paid"
        });
        orders.map(order => {
            revenues += order.totalAmount;
        });
        return revenues;
    }

    async getAllNewOrder() {
        const db = await initORM();
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const [orders, count] = await db.orders.findAndCount({
            createdAt: {
                $gte: oneDayAgo
            }
        });
        return {
            count
        }
    }

    async getPendingOrder() {
        const db = await initORM();
        const [orders, count] = await db.orders.findAndCount({
            orderStatus: "pending"
        });
        return {
            count
        }
    }

    async getCanncelOrder() {
        const db = await initORM();
        const [orders, count] = await db.orders.findAndCount({
            isDeleted: true
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
                isDeleted: false,
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
