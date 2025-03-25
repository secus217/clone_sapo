import {Elysia, t} from "elysia";
import orderService from "../services/OrdersService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const orderController = new Elysia()
    .group("/order", group =>
        group
            .use(orderService)
            .derive(isAdmin())
            .post("/create-new-order", async ({body,ordersService}) => {
                return await ordersService.createOrder(body)
            }, {
                detail: {
                    tags: ["Manage order"],
                    security: [{JwtAuth: []}]
                },
                body: t.Object({
                    storeId: t.Number(),
                    createrId: t.Number(),
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
                    receiverPhone: t.String()
                })
            })
    )
export default orderController;