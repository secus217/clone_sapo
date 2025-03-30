import {Elysia, t} from "elysia";
import receiptNoteService from "../services/ReceiptNoteService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const receiptNoteController = new Elysia()
    .group("/receipt-note", group =>
        group
            .use(receiptNoteService)
            .derive(isAdmin())
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
    )
export default receiptNoteController;