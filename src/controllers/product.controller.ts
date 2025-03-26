import {Elysia, t} from "elysia";
import productService from "../services/ProductService";
import {isAuthenticated, isAdmin} from "../middlewares/isAuthenticated"

const productController = new Elysia()
    .group("/product", group =>
        group
            .use(productService)
            .derive(isAdmin())
            .post("/create-new-product", async ({body, productService}) => {
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
                    initialStoreId: t.Number(),
                    initialQuantity: t.Number()
                })
            })
            .put("/update-product", async ({body, productService}) => {
                return await productService.updateProduct(body.productId, body.data)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                body: t.Object({
                    productId:t.Number(),
                    data:t.Object({
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
            .put("/delete-product", async ({query, productService}) => {
                return await productService.deleteProduct(query.productId)
            }, {
                detail: {
                    tags: ["Manage product"],
                    security: [{JwtAuth: []}],
                },
                query: t.Object({
                    productId:t.Number()
                })
            })


    )
export default productController;