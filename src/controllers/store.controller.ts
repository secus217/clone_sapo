import {Elysia, t} from "elysia";
import storeService from "../services/StoreService";
import {isAuthenticated, isAdmin, isAdminOrStaff} from "../middlewares/isAuthenticated"
import manageUserService from "../services/ManageUserService";

const storeController = new Elysia()
    .group("/store", group =>
        group
            .use(storeService)
            .derive(isAdmin())
            .post("/create-default-store", async ({user,body, storeService}) => {
                return await storeService.createDefaultStore(user.id,body)
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    name: t.String(),
                    address:t.String()
                })
            })
            .post("/create-new-store", async ({user,body, storeService}) => {
                return await storeService.createStore(user.id,body)
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    name: t.String(),
                    address:t.String()
                })
            })
            .post("/get-all-store-of-user", async ({user, storeService}) => {
                return await storeService.getALlStores(user.id)
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                }

            })
            .post("/get-all-store-of-admin", async ({user, storeService}) => {
                console.log(user)
                if(user.role!=="admin"){
                    return [];
                }
                return await storeService.getAllStoresOfAdmin()
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                }

            })


    )
    .group("/shared", sharedGroup =>
        sharedGroup
            .use(storeService)
            .derive(isAdminOrStaff())
            .post("/get-all-store-of-admin", async ({user, storeService}) => {
                return await storeService.getAllStoresOfAdmin()
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                }
            })
            .get("/get-store-detail", async ({query, storeService}) => {
                return await storeService.getStoreDetails(query.storeId)
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    storeId:t.Number()
                })
            })
    )
export default storeController;