import {Elysia, t} from "elysia";
import manageUserService from "../services/ManageUserService";
import {isAuthenticated, isAdmin,isAdminOrStaff} from "../middlewares/isAuthenticated"

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
                            username: t.Optional(t.String()),
                            phone:t.Optional(t.String()),
                            address:t.Optional(t.String()),
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

            // .get("/get-all-customer", async ({query, manageUserService}) => {
            //     const page = query.page ? parseInt(query.page) : 1;
            //     const limit = query.limit ? parseInt(query.limit) : 10;
            //     const search = query.search;
            //
            //     return await manageUserService.getALLCustomer(page, limit, search);
            // }, {
            //     detail: {
            //         tags: ["Manage user"],
            //         security: [{JwtAuth: []}]
            //     },
            //     query: t.Object({
            //         page: t.Optional(t.String()),
            //         limit: t.Optional(t.String()),
            //         search: t.Optional(t.String())
            //     })
            // })
            .put("/update-role-for-user", async ({body, manageUserService}) => {
                return await manageUserService.updateRoleForUser(body.userId, body.role,body.storeId);
            }, {
                detail: {
                    tags: ["Manage user"],
                    security: [{JwtAuth: []}]
                },
                body:t.Object({
                    userId:t.Number(),
                    role:t.String(),
                    storeId:t.Number()
                })
            })
            .get("/get-all-staff", async ({query, manageUserService}) => {
                const page = query.page ? parseInt(query.page) : 1;
                const limit = query.limit ? parseInt(query.limit) : 10;
                const search=query.search;
                return await manageUserService.getAllStaff(page, limit,search);
            }, {
                detail: {
                    tags: ["Manage user"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    search:t.Optional(t.String())
                })
            })


    )
    .group("/shared", sharedGroup =>
        sharedGroup
            .use(manageUserService)
            .derive(isAdminOrStaff())
            .get("/get-all-customer", async ({query, manageUserService}) => {
                const page = query.page ? parseInt(query.page) : 1;
                const limit = query.limit ? parseInt(query.limit) : 10;
                const search = query.search;

                return await manageUserService.getALLCustomer(page, limit, search);
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
            .post("/add-customer", async ({body, manageUserService}) => {
                    return await manageUserService.addUserWithRoleCustomer(body)
                },
                {
                    detail: {
                        tags: ["Manage user"],
                        security: [{JwtAuth: []}]
                    },
                    body: t.Object({
                        username:t.String(),
                        phone:t.String(),
                        addresses:t.Optional(t.String())

                    })
                }
            )
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

    )
export default manageUserController;