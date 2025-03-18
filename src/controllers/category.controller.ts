import {Elysia, t} from "elysia";
import categoryService from "../services/CategoryService"
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const categoryController = new Elysia()
    .group("/category", group =>
        group
            .use(categoryService)
            .derive(isAuthenticated())
            .get("/get-all-category", async ({query, categoryService}) => {
                const page = query.page ? parseInt(query.page as string) : 1;
                const limit = query.limit ? parseInt(query.limit as string) : 10;
                const search = query.search as string | undefined;
                return await categoryService.getAllCategories(page, limit, search);
            }, {
                detail: {
                    tags: ["Category"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    search: t.Optional(t.String()),
                })
            })
            .post("create-category",async ({body, categoryService}) => {
                return await categoryService.createCategory(body);
            },{
                detail:{
                    tags:["Category"],
                    security:[{JwtAuth:[]}]
                },
                body:t.Object({
                    name:t.String(),
                    description:t.String()
                })
            })
            .put("update-category",async ({body, categoryService}) => {
                return await categoryService.updateCategory(body.id, body.data);
            },{
                detail:{
                    tags:["Category"],
                    security:[{JwtAuth:[]}]
                },
                body:t.Object({
                    id:t.Number(),
                    data:t.Object({
                        name:t.String(),
                        description:t.String()
                    })

                })
            })
            .delete("delete-category",async ({body, categoryService}) => {
                return await categoryService.deleteCategory(body.id);
            },{
                detail:{
                    tags:["Category"],
                    security:[{JwtAuth:[]}]
                },
                body:t.Object({
                    id:t.Number(),
                    })
            })

    )
export default categoryController;