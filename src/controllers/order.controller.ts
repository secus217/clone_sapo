import {Elysia, t} from "elysia";
import orderService from "../services/OrdersService";
import {isAuthenticated, isAdmin, isAdminOrStaff} from "../middlewares/isAuthenticated"
import exportNoteService from "../services/ExportNoteService";

const orderController = new Elysia()
    .group("/order", group =>
        group
            .use(orderService)
            .derive(isAdmin())
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
                        description: "status can be only 'processing' or 'completed' or 'cancelled'"
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
            .get("/get-order-by-product-id", async ({query, ordersService}) => {
                const page = query.page ? parseInt(query.page as string) : 1;
                const limit=query.limit ? parseInt(query.limit as string) : 10;
                const productId=parseInt(query.productId);
                return await ordersService.getOrderByProductId(page,limit,productId)
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}],
                        description: "Get order by product id"
                    },
                    query: t.Object({
                        productId: t.String(),
                        page: t.Optional(t.String()),
                        limit: t.Optional(t.String()),
                    })
                }
            )
            .get("/get-order-by-customer-id", async ({query, ordersService}) => {
                    const page = query.page ? parseInt(query.page as string) : 1;
                    const limit=query.limit ? parseInt(query.limit as string) : 10;
                    const productId=parseInt(query.customerId);
                    return await ordersService.getOrderByCustomerId(page,limit,productId)
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}],
                        description: "Get order by product id"
                    },
                    query: t.Object({
                        customerId: t.String(),
                        page: t.Optional(t.String()),
                        limit: t.Optional(t.String()),
                    })
                }
            )
            .delete("/delete-order", async ({user,body, ordersService}) => {
                    if(user.role==="staff"){
                        throw new Error("You dont have permission to perform this action.");
                    }
                    return await ordersService.deleteOrder(body.orderId);
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}],
                        description: "Delete order"
                    },
                    body: t.Object({
                        orderId:t.Number()
                    })
                }
            )
            // .put("/update-order", async ({ body, ordersService }) => {
            //     const { orderId, ...updateData } = body;
            //     return await ordersService.updateOrder(orderId, updateData);
            // }, {
            //     detail: {
            //         tags: ["Manage order"],
            //         security: [{ JwtAuth: [] }],
            //         description: "Update order"
            //     },
            //     body: t.Object({
            //         orderId: t.Number(),
            //         storeId: t.Optional(t.Number()),
            //         createrId: t.Optional(t.Number()),
            //         quantity: t.Optional(t.Number()),
            //         totalAmount: t.Optional(t.Number()),
            //         paymentMethod: t.Optional(t.Union([
            //             t.Literal("cash"),
            //             t.Literal("bank")
            //         ])),
            //         paymentStatus: t.Optional(t.Union([
            //             t.Literal("pending"),
            //             t.Literal("paid")
            //         ])),
            //         orderStatus: t.Optional(t.Union([
            //             t.Literal("completed"),
            //             t.Literal("cancelled"),
            //             t.Literal("pending")
            //         ])),
            //         shippingStatus: t.Optional(t.Union([
            //             t.Literal("processing"),
            //             t.Literal("completed"),
            //             t.Literal("cancelled")
            //         ])),
            //         customerId: t.Optional(t.Number()),
            //     })
            // })
    )
    .group("/shared", sharedGroup =>
        sharedGroup
            .use(orderService)
            .derive(isAdminOrStaff())
            .get("/get-all-order", async ({query, ordersService}) => {
                    const filter = {
                        productId: query.productId,
                        storeId: query.storeId,
                    }
                    return await ordersService.getAllOrder(query.page, query.limit, filter);
                }, {
                    detail: {
                        tags: ["Manage order"],
                        security: [{JwtAuth: []}],
                        description: "Get all order"
                    },
                    query: t.Object({
                        page: t.Optional(t.Number()),
                        limit: t.Optional(t.Number()),
                        productId: t.Optional(t.Number()),
                        storeId: t.Optional(t.Number())
                    })
                }
            )
            .post("/create-new-order", async ({user, body, ordersService}) => {
                return await ordersService.createOrder(body, user.id)
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "paymentStatus can only be 'pending' or 'paid'," + "paymentMethod can only be 'cash' or 'bank'"
                },
                body: t.Object({
                    fromStoreId: t.Number(),
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
                    customerId: t.Number(),
                    paymentStatus: t.Union([
                            t.Literal("pending"),
                            t.Literal("paid")
                        ]
                    ),

                })
            })
            .get("/get-revenues", async ({user, body, ordersService}) => {
                return await ordersService.getAllRevenue();
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "get all revenue"
                }
            })
            .get("/get-count-all-new-order", async ({user, ordersService}) => {
                return await ordersService.getAllNewOrder();
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "count all new order"
                }
            })

            .get("/get-count-pending-order", async ({user, ordersService}) => {
                return await ordersService.getPendingOrder();
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "count all pending order"
                }
            })
            .get("/get-count-cancel-order", async ({user, ordersService}) => {
                return await ordersService.getCanncelOrder();
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "count all cancel order"
                }
            })
            .get("/get-revenue-by-day", async ({user,query, ordersService}) => {
                return await ordersService.getAllRevenueByTime(query.day);
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}],
                    description: "count all cancel order"
                },
                query:t.Object({
                    day:t.Number()
                })
            })
    )
export default orderController;