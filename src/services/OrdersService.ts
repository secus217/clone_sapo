import {initORM} from "../db"
import {Elysia} from "elysia"
import {Orders, ExportNote, OrderDetail, ExportNoteDetail, ReceiptNote, Product, Inventory} from "../entities/index";

export class OrdersService {
    async createOrder(data: {
                          storeId: number, createrId: number, paymentMethod: 'cash' | 'bank',
                          items: Array<{
                              productId: number;
                              quantity: number;
                              unitPrice: number;
                          }>,
                          shippingAddress: string,
                          customerId?: number,
                          receiverName: string,
                          receiverPhone: string
                      }
    ) {
        const db = await initORM();
        const em = db.em.fork();

        try {
            await em.begin();

            const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            // Tạo Order trước
            const order = em.create(Orders, {
                storeId: data.storeId,
                createrId: data.createrId,
                shippingAddress: data.shippingAddress,
                quantity: totalQuantity,
                totalAmount: totalAmount,
                paymentMethod: data.paymentMethod,
                orderStatus: "pending",
                receiverName: data.receiverName,
                receiverPhone: data.receiverPhone,
                shippingStatus: "processing",
                customerId: data.customerId,
                paymentStatus: "pending",
            });

            // Flush order để có ID
            await em.flush();

            // Tạo OrderDetails
            const orderDetails = data.items.map(item =>
                em.create(OrderDetail, {
                    orderId: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice
                })
            );

            // Tạo ExportNote - CHÚ Ý PHẦN NÀY
            const exportNote = em.create(ExportNote, {
                orderId: order.id,
                storeId: data.storeId,
                createrId: data.createrId,
                totalQuantity: totalQuantity,
                status: "completed"
            });

            // Flush exportNote để có ID
            await em.flush();

            // Tạo ExportNoteDetails
            const exportNoteDetails = data.items.map(item =>
                em.create(ExportNoteDetail, {
                    exportNoteId: exportNote.id, // Gán exportNoteId từ exportNote vừa tạo
                    productId: item.productId,
                    quantity: item.quantity
                })
            );

            // Tạo ReceiptNote
            const receiptNote = em.create(ReceiptNote, {
                orderId: order.id,
                storeId: data.storeId,
                createrId: data.createrId,
                totalAmount: totalAmount,
                paymentMethod: data.paymentMethod,
                status: "completed"
            });

            // Persist tất cả các entity
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
            // Rollback nếu có lỗi
            await em.rollback();
            throw new Error(e.message);
        } finally {
            // Đóng EntityManager
            em.clear();
        }
    }
}

export default new Elysia().decorate("ordersService", new OrdersService())
