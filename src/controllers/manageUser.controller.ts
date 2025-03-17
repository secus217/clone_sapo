import {Elysia, t} from "elysia";
import manageUserService from "../services/ManageUserService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const manageUserController = new Elysia()
    .group("/manage", group =>
        group
            .use(manageUserService)
            .derive(isAdmin())
            .get("/get-all-user", async ({query, manageUserService}) => {
                const page = query.page ? parseInt(query.page) : 1;
                const limit = query.limit ? parseInt(query.limit) : 10;
                const search = query.search;

                return await manageUserService.getAllUsers(page, limit, search);
            }, {
                detail: {
                    tags: ["Manage user"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    search: t.Optional(t.String())
                })

            })
            .get("/get-user-by-id", async ({query, manageUserService}) => {
                return await manageUserService.getUserById(query.userId);
            }, {
                detail: {
                    tags: ["Manage user"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    userId: t.Number(),

                })

            })
            .post("/update-user", async ({body, manageUserService}) => {
                    return await manageUserService.updateUser(body.id, body.data);
                },
                {
                    detail: {
                        tags: ["Manage user"],
                        security: [{JwtAuth: []}]
                    },
                    body: t.Object({
                        id: t.Number(),
                        data: t.Object({
                            username: t.String(),
                            role: t.String(),
                        })
                    })
                }
            )
            .delete("/delete-user-by-id", async ({body, manageUserService}) => {
                    return await manageUserService.deleteUser(body.id);
                },
                {
                    detail: {
                        tags: ["Manage user"],
                        security: [{JwtAuth: []}]
                    },
                    body: t.Object({
                        id: t.Number(),
                    })
                }
            )
    )
export default manageUserController;