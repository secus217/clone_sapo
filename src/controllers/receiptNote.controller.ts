import {Elysia, t} from "elysia";
import receiptNoteService from "../services/ReceiptNoteService";
import {isAuthenticated, isAdmin, isAdminOrStaff} from "../middlewares/isAuthenticated"
import productService from "../services/ProductService";

const receiptNoteController = new Elysia()
    .group("/receipt-note", group =>
        group
            .use(receiptNoteService)
            .derive(isAdmin())


            .get("get-all-receipt-note-for-admin", async ({user, query, receiptNoteService}) => {
                if(user.role!=="admin"){
                    throw new Error("You dont have permission to do this action")
                }
                const filter={
                    storeId:query.storeId
                }
                return await receiptNoteService.getAllReceiptNoteForAdmin(filter,query.page,query.limit)
            }, {
                detail: {
                    tags: ["Receipt note"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    storeId: t.Optional(t.Number()),
                    page:t.Optional(t.Number()),
                    limit:t.Optional(t.Number())
                })
            })
    )
    .group("/shared", sharedGroup =>
        sharedGroup
            .use(receiptNoteService)
            .derive(isAdminOrStaff())
            .post("/create-new-receipt", async ({user, body, receiptNoteService}) => {
                return await receiptNoteService.createNewReceiptNote(user.id,body)
            }, {
                detail: {
                    tags: ["Receipt note"],
                    security: [{JwtAuth: []}],
                    description: "paymentMethod can only be 'cash' or 'bank'+type can only be 'THU' 'CHI' "
                },
                body: t.Object({
                    storeId: t.Number(),
                    totalAmount: t.Number(),
                    paymentMethod: t.Union([
                        t.Literal("cash"),
                        t.Literal("bank")
                    ]),
                    note: t.String(),
                    type:t.Union([
                        t.Literal("THU"),
                        t.Literal("CHI")
                    ])
                })
            })
            .get("get-all-receipt-note", async ({user, query, receiptNoteService}) => {
                return await receiptNoteService.getAllReceiptNotes(query.storeId,query.page,query.limit)
            }, {
                detail: {
                    tags: ["Receipt note"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    storeId: t.Number(),
                    page:t.Optional(t.Number()),
                    limit:t.Optional(t.Number())
                })
            })
            .get("get-all-receipt-note-by-product-id", async ({user, query, receiptNoteService}) => {
                return await receiptNoteService.getAllReceiptNoteByProductId(query.productId)
            }, {
                detail: {
                    tags: ["Receipt note"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    productId: t.Number(),
                })
            })
            .get("get-tong-thu-chi", async ({user, query, receiptNoteService}) => {
                return await receiptNoteService.getTongThu()
            }, {
                detail: {
                    tags: ["Receipt note"],
                    security: [{JwtAuth: []}],
                }
            })

    )
export default receiptNoteController;