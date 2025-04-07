import {Elysia, t} from "elysia";
import exportNoteService from "../services/ExportNoteService";
import {isAuthenticated, isAdmin, isAdminOrStaff} from "../middlewares/isAuthenticated"
import receiptNoteService from "../services/ReceiptNoteService";

const exportNoteController = new Elysia()
    .group("/manage", group =>
        group
            .use(exportNoteService)
            .derive(isAdmin())
            .post("/approve-import-note", async ({user, body, exportNoteService}) => {
                return await exportNoteService.aprroveImportNote(user.id, body);
            }, {
                detail: {
                    tags: ["Export note"],
                    security: [{JwtAuth: []}]
                },
                body: t.Object({
                    exportNoteId: t.Number()
                })
            })

            .get("/get-export-note-detail-by-id", async ({query, exportNoteService}) => {

                return await exportNoteService.getExportNoteDetail(query.exportNoteId);
            }, {
                detail: {
                    tags: ["Export note"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    exportNoteId: t.Number()
                })
            })
    )
    .group("/shared", sharedGroup =>
        sharedGroup
            .use(exportNoteService)
            .derive(isAdminOrStaff())
            .post("/create-new-export-note", async ({user, body, exportNoteService}) => {
                return await exportNoteService.createNewExportNote(user.id, body);
            }, {
                detail: {
                    tags: ["Export note"],
                    security: [{JwtAuth: []}]
                },
                body: t.Object({
                    fromStoreId: t.Number(),
                    toStoreId: t.Number(),
                    product: t.Array(t.Object({
                        productId: t.Number(),
                        quantity: t.Number()
                    })),
                    note: t.Optional(t.String()),
                })
            })
            .get("/get-all-export-note", async ({query, exportNoteService}) => {
                const page = query.page ? parseInt(query.page) : 1;
                const limit = query.limit ? parseInt(query.limit) : 10;
                const filter = {
                    storeId: query.storeId,
                    type:query.type
                };
                return await exportNoteService.getListExportNote(page, limit, filter);
            }, {
                detail: {
                    tags: ["Export note"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    storeId: t.Optional(t.Number()),
                    type:t.Optional(t.Union([
                        t.Literal("nhap"),
                        t.Literal("xuat")
                    ]))
                })
            })
    )
export default exportNoteController;