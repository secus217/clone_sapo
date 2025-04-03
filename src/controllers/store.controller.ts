import {Elysia, t} from "elysia";
import storeService from "../services/StoreService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const storeController = new Elysia()
    .group("/store", group =>
        group
            .use(storeService)
            .derive(isAdmin())
            .post("/create-new-store", async ({user,body, storeService}) => {
                return await storeService.createStore(user.id,body)
            }, {
                detail: {
                    tags: ["Manage store"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    name: t.String(),
                    phoneNumber:t.String(),
                    email:t.String(),
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
export default storeController;