import {Elysia, t} from "elysia";
import orderService from "../services/OrderService"
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const orderController = new Elysia()
    .group("/order", group =>
        group
            .use(orderService)
            .derive(isAuthenticated())
            .get("/get-all-order", async ({query, orderService}) => {
                const page = query.page ? parseInt(query.page as string) : 1;
                const limit = query.limit ? parseInt(query.limit as string) : 10;
                const search = query.status as string | undefined;
                return await orderService.getAllOrders(page, limit, search);
            }, {
                detail: {
                    tags: ["Order"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    status: t.Optional(t.String()),
                })
            })
            .get("get-order-by-id", async ({query, orderService}) => {
                return await orderService.getOrderById(query.id)
            }, {
                detail: {
                    tags: ["Order"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    id: t.Number()
                })
            })
            // .post("create-order", async ({body, orderService}) => {
            //         return await orderService.createOrder()
            //     },{
            //     detail: {
            //         tags: ["Order"],
            //         security: [{JwtAuth: []}]
            //     },
            //     body:t.Object({
            //         customerId:t.Number(),
            //         items:t.Array(t.Object({
            //             productId:t.Number(),
            //             quantity:t.Number(),
            //             price:t.Number()
            //         }))
            //     })
            //     }
            // )
    )
export default orderController;