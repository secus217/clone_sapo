import {Elysia, t} from "elysia";
import manageUserService from "../services/ManageUserService";
const manageUserController = new Elysia()
    .group("/manage", group =>
        group
            .use(manageUserService)
            .get("/get-all-user", async ({query, manageUserService}) => {
                const page = query.page ? parseInt(query.page) : 1;
                const limit = query.limit ? parseInt(query.limit) : 10;
                const search = query.search;

                return await manageUserService.getAllUsers(page, limit, search);
            }, {
                detail: {
                    tags: ["Manage user"],
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    search: t.Optional(t.String())
                })

            })


    )
export default manageUserController;