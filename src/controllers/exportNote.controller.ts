import {Elysia, t} from "elysia";
import exportNoteService from "../services/ExportNoteService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const exportNoteController = new Elysia()
    .group("/manage", group =>
        group
            .use(exportNoteService)
            .derive(isAdmin())
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
    )
export default exportNoteController;