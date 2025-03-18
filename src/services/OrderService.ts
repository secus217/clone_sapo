import {initORM} from "../db";
import {QueryOrder, wrap} from "@mikro-orm/core";
import {Order,OrderItem} from "../entities/index";
import {OrderStatus} from "../entities/Order";
import {Elysia} from "elysia";

export class OrderService {
    async getAllOrders(page: number = 1, limit: number = 10, status?: string) {
        const db = await initORM();
        const offset = (page - 1) * limit;
        const options = {
            limit,
            offset,
            orderBy: {createdAt: QueryOrder.DESC},
            populate: ['customer'],
        };
        let where: any = {};
        if (status) {
            where.status = status;
        }
        const [orders, total] = await db.order.findAndCount(where, options as any);
        const totalPages = Math.ceil(total / limit);
        return {
            data: orders.map(order => {
                const cus = order.customer;
                return {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    totalAmount: order.totalAmount,
                    customer: {
                        id: cus.id,
                        name: cus.username,
                        phone: cus.phone
                    }
                }
            }),
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page <= totalPages,
                hasPreviousPage: page > 1
            }
        }
    }

    async getOrderById(id: number) {
        const db = await initORM();
        const order = await db.order.findOne({id}, {populate: ['customer', 'items', 'items.product']});
        if (!order) {
            return {
                success: false,
                message: "Đơn hàng không tồn tại",
            }
        }
        return {
            success: true,
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount,
                customer: order.customer ? {
                    id: order.customer.id,
                    name: order.customer.username,
                    phone: order.customer.phone,
                    address: order.customer.address,
                } : null,
                items: order.items.getItems().map((item) => {
                    const product = item.product.unwrap();
                    return {
                        id: item.id,
                        quantity: item.quantity,
                        price: item.totalPrice,
                        product: {
                            id: product.id,
                            name: product.name,
                            sku: product.sku,
                            imageUrls: product.imageUrls,
                        }
                    }

                })
            }
        }
    }

    async createOrder(orderData: {
        customerId?: number,
        items: Array<{
            productId: number,
            quantity: number,
            price: number
        }>,
        shippingAddress?: string,
        paymentMethod?: string,
        paymentStatus?: 'pending' | 'paid' | 'failed'
    }) {
        const db = await initORM();
        const order = new Order();

        const orderNumber = 'ORD-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

        let totalAmount = 0;
        for (const item of orderData.items) {
            totalAmount += item.quantity * item.price;
        }

        wrap(order).assign({
            orderNumber,
            status: OrderStatus.PENDING,
            totalAmount,
            shippingAddress: orderData.shippingAddress || null,
            paymentMethod: orderData.paymentMethod || null,
            paymentStatus: orderData.paymentStatus || 'pending'
        });

        if (orderData.customerId) {
            const customer = await db.user.findOne({id: orderData.customerId});
            if (customer) {
                order.customer = customer;
            } else {
                return {
                    success: false,
                    message: 'Không tìm thấy khách hàng'
                };
            }
        } else {
            return {
                success: false,
                message: 'Vui lòng cung cấp thông tin khách hàng'
            };
        }

        await db.em.persistAndFlush(order);

        for (const itemData of orderData.items) {
            const product = await db.product.findOne({id: itemData.productId});
            if (product) {
                const orderItem = new OrderItem();
                wrap(orderItem).assign({
                    order,
                    product,
                    quantity: itemData.quantity,
                    totalPrice: itemData.price
                });

                const inventory = await db.inventory.findOne({product: product.id});
                if (inventory) {
                    inventory.quantity -= itemData.quantity;
                    if (inventory.quantity < 0) inventory.quantity = 0;
                }

                db.em.persist(orderItem);
            } else {
                console.log(`Sản phẩm ID ${itemData.productId} không tồn tại`);
            }
        }

        await db.em.flush();

        return this.getOrderById(order.id);
    }
    async updateOrderStatus(id: number, status: OrderStatus) {
        const db = await initORM();
        const order = await db.order.findOne({id});

        if (!order) {
            return {
                success: false,
                message: 'Đơn hàng không tồn tại'
            };
        }

        order.status = status;
        await db.em.flush();
        return {
            success: true,
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status
            }
        };
    }

    async deleteOrder(id: number) {
        const db = await initORM();
        const order = await db.order.findOne({id},{populate:["items"]});
        if (!order) {
            return {
                success: false,
                message:"Đơn hàng không tồn tại"
            }
        }
        for (const item of order.items.getItems()) {
            db.em.remove(item);
        }
        db.em.remove(order);
        await db.em.flush();
        return {
            success: true,
            message:"Xóa đơn hàng thành công!"
        }

    }
}
export default new Elysia().decorate("orderService",new OrderService());