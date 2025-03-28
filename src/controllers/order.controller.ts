import {Elysia, t} from "elysia";
import orderService from "../services/OrdersService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const orderController = new Elysia()
    .group("/order", group =>
        group
            .use(orderService)
            .derive(isAdmin())
            .post("/create-new-order", async ({user,body, ordersService}) => {
                return await ordersService.createOrder(body,user.id)
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "paymentStatus can only be 'pending' or 'paid'," + "paymentMethod can only be 'cash' or 'bank'"
                },
                body: t.Object({
                    storeId: t.Number(),
                    paymentMethod: t.Union([
                        t.Literal("cash"),
                        t.Literal("bank")
                    ]),
                    items: t.Array(t.Object({
                            productId: t.Number(),
                            quantity: t.Number(),
                            unitPrice: t.Number()
                        })
                    ),
                    shippingAddress: t.String(),
                    customerId: t.Optional(t.Number()),
                    receiverName: t.String(),
                    receiverPhone: t.String(),
                    paymentStatus: t.Union([
                            t.Literal("pending"),
                            t.Literal("paid")
                        ]
                    ),

                })
            })
            .get("/get-order-detail", async ({query, ordersService}) => {
                    return await ordersService.getOrderDetail(query.orderId)
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}]
                    },
                    query: t.Object({
                        orderId: t.Number()
                    })
                }
            )
            .put("/update-order-status", async ({body, ordersService}) => {
                    return await ordersService.updateOrderStatus(body.orderId, body.status, body.paymentStatus)
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}],
                        description: "status can be only 'completed' or 'cancelled'|| paymentStatus can be only 'paid' or 'cancelled'",
                    },
                    body: t.Object({
                        orderId: t.Number(),
                        status: t.Union(
                            [t.Literal('completed'),
                                t.Literal('cancelled')]
                        ),
                        paymentStatus: t.Optional(t.Union([
                            t.Literal("paid"),
                            t.Literal("cancelled"),
                        ]))
                    })
                }
            )
            .put("/update-shipping-status", async ({body, ordersService}) => {
                    return await ordersService.updateShippingStatus(body.orderId, body.status)
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}],
                        description:"status can be only 'processing' or 'completed' or 'cancelled'"
                    },
                    body: t.Object({
                        orderId: t.Number(),
                        status: t.Union(
                            [
                                t.Literal('processing'),
                                t.Literal('completed'),
                                t.Literal('cancelled')
                            ]
                        )
                    })
                }
            )
    )
export default orderController;