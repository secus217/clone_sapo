import {Elysia, t} from "elysia";
import productService from "../services/ProductService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const productController = new Elysia()
    .group("/product", group =>
        group
            .use(productService)
            .derive(isAdmin())
            .get("/get-all-product", async ({query, productService}) => {
                const page = query.page ? parseInt(query.page as string) : 1;
                const limit = query.limit ? parseInt(query.limit as string) : 10;
                const search = query.search as string | undefined;
                const categoryId = query.categoryId ? parseInt(query.categoryId as string) : undefined;

                return await productService.getAllProducts(page, limit, search, categoryId);
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}]
                },
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    search: t.Optional(t.String()),
                    categoryId: t.Optional(t.String())
                })
            })
            .get("/products/:id", async ({params, productService}) => {
                return await productService.getProductById(params.id);
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}]
                },
                params: t.Object({
                    id: t.Number()
                })
            })
            .post("/create-product", async ({body, productService}) => {
                    return await productService.createProduct(body);
                }, {
                    detail: {
                        tags: ["Manage product"],
                        security: [{JwtAuth: []}]
                    },
                    body: t.Object({
                        name: t.String(),
                        description: t.String(),
                        sku: t.String(),
                        barcode: t.Optional(t.String()),
                        retailPrice: t.Number(),
                        importPrice: t.Number(),
                        isActive: t.Boolean(),
                        category: t.Optional(t.Number()),
                        imageUrls:t.Optional(t.String())
                    })
                }
            )
            .patch("/update-product/:id", async ({body, productService, params}) => {
                    return await productService.updateProduct(params.id, body);
                }, {
                    detail: {
                        tags: ["Manage product"],
                        security: [{JwtAuth: []}]
                    },
                    body: t.Object({
                        name: t.String(),
                        description: t.String(),
                        sku: t.String(),
                        barcode: t.Optional(t.String()),
                        retailPrice: t.Number(),
                        importPrice: t.Number(),
                        isActive: t.Boolean(),
                        categoryId: t.Optional(t.Number()),
                        imageUrls:t.Optional(t.String())
                    }),
                    params: t.Object({
                        id: t.Number()
                    })
                }
            )
            .delete("/delete-product/:id", async ({productService, params}) => {
                    return await productService.deleteProduct(params.id);
                }, {
                    detail: {
                        tags: ["Manage product"],
                        security: [{JwtAuth: []}]
                    },
                    params: t.Object({
                        id: t.Number()
                    })
                }
            )
    )
export default productController;