import {Elysia, t} from "elysia";
import productService from "../services/ProductService";
import {isAuthenticated, isAdmin, isAdminOrStaff} from "../middlewares/isAuthenticated"
import storeService from "../services/StoreService";

const productController = new Elysia()
    .group("/product", group =>
        group
            .use(productService)
            .derive(isAdmin())
            .put("/update-product", async ({body, productService}) => {
                return await productService.updateProduct(body.productId, body.data)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    productId: t.Number(),
                    data: t.Object({
                        name: t.Optional(t.String()),
                        description: t.Optional(t.String()),
                        sku: t.Optional(t.String()),
                        retailPrice: t.Optional(t.Number()),
                        importPrice: t.Optional(t.Number()),
                        isActive: t.Optional(t.Boolean()),
                        categoryId: t.Optional(t.Number()),
                        imageUrls: t.Optional(t.String()),
                    })
                })
            })
    )
    .group("/shared", sharedGroup =>
        sharedGroup
            .use(productService)
            .derive(isAdminOrStaff())
            .get("/get-all-product-of-admin", async ({user, query, productService}) => {
                return await productService.getAllProductForAdmin(query.page, query.limit)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                    description: "Get all product by store id"
                },
                query: t.Object({
                    page: t.Optional(t.Number()),
                    limit: t.Optional(t.Number())
                })
            })
            .post("/create-new-product", async ({user, body, productService}) => {
                if (user.role !== "admin") {
                    throw new Error("You dont have permission!")
                }
                return await productService.createProduct(body)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    name: t.String(),
                    description: t.String(),
                    sku: t.String(),
                    retailPrice: t.Number(),
                    importPrice: t.Number(),
                    isActive: t.Optional(t.Boolean()),
                    categoryId: t.Optional(t.Number()),
                    imageUrls: t.Optional(t.String()),
                })
            })
            .post("/provide-product-to-inventory", async ({user, body, productService}) => {

                return await productService.provideProductToInventory(user.id,body.storeId,body.productId,body.quantity);
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    storeId: t.Number(),
                    productId: t.Number(),
                    quantity: t.Number()
                })
            })
            .get("/get-all-product-by-store-id", async ({query, productService}) => {
                const search = query?.search
                return await productService.getAllProductsByStoreId(query.storeId, search)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                    description: "Get all product by store id"
                },
                query: t.Object({
                    storeId: t.Optional(t.Number()),
                    search: t.Optional(t.String())
                })
            })
            .put("/delete-product", async ({query, productService}) => {
                return await productService.deleteProduct(query.productId)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    productId: t.Number()
                })
            })
            .get("/top-product", async ({productService,query}) => {
                return await productService.getTopProduct(query.date)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    date: t.String()
                })

            })
            .get("/near-order", async ({productService}) => {
                return await productService.nearOrder()
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                }

            })
    )
export default productController;