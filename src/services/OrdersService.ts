import {initORM} from "../db"
import {Elysia} from "elysia"
import {ExportNote, ExportNoteDetail, OrderDetail, Orders, ReceiptNote} from "../entities/index";

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

                      },createrId: number
    ) {
        const db = await initORM();
        const em = db.em.fork();

        try {
            await em.begin();
            for (const product of data.items) {
                const inventory = await db.inventory.findOne({storeId: data.fromStoreId, productId: product.productId});
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
                    orderId: order.id,
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
                toStoreId:null,
                totalQuantity: totalQuantity,
                status: "completed"
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
                type:"THU"
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
        const order = await db.orders.findOne({id: orderId});
        if (!order) {
            throw new Error("Order not found");
        }
        const orderDetail = await db.orderDetail.find({orderId: orderId});
        return {
            order,
            orderDetail
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
        const order = await db.orders.findOne({id: orderId});
        if (!order) {
            throw new Error("Order not found");
        }
        await db.em.nativeDelete(OrderDetail, {orderId: orderId});
        await db.em.removeAndFlush(order);
        return {
            message: "Order deleted successfully",
        }
    }
    async getOrderByProductId(productId: number) {
        const db = await initORM();
        const orderdetail=await db.orderDetail.find({productId: productId});
        if(!orderdetail) {
            throw new Error("Order not found");
        }
        const orderIds=orderdetail.map(order => order.orderId);
        const orders=await db.orders.find({
            id:{$in: orderIds}
        })
        const orderWithDetails:any=orders.map(order=>{
            const detailForOrder=orderdetail.filter(detail=>detail.orderId===order.id);
            return {
                ...order,
                orderDetail:detailForOrder
            }
        });
        return {
            orders:orderWithDetails
        }


    }
    async getOrderByCustomerId(customerId: number) {
        const db = await initORM();
        const order=await  db.orders.find({customerId:customerId});
        if(!order) {
            throw new Error("Order not found");
        }
        const orderIds=order.map(order => order.id);
        const orderDetaills= await db.orderDetail.find({
            orderId:{$in: orderIds}
        });
        const totalAmount=order.reduce((sum,currentOrder)=>{
            return sum + currentOrder.totalAmount;
        },0);
        return order.map(item=>{
            const orderDetailItem=orderDetaills.find(orDetail=>orDetail.orderId===item.id)
            return{
                ...item,
                orderDetailItem,
                totalExpense:totalAmount
            } as any;
        })
    }
    async getAllOrder(page:number=1,limit:number=10) {
        const db=await initORM();
        const offset=(page - 1) * limit;
        const [order,total]=await db.orders.findAndCount({},{
            limit,
            offset,
            orderBy:{createdAt:'DESC'}
        });
        return{
            order,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }

    }

}

export default new Elysia().decorate("ordersService", new OrdersService())
