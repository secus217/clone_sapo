import User from "../entities/User";
import {initORM} from "../db";
export const isAuthenticated = (
) => {
    return async ({headers, jwt}: any) => {
        const db= await initORM();
        const em = db.em.fork();
        const {authorization} = headers;
        if (!authorization) {
            throw new Error("Please login to continue");
        }
        const token = authorization.split(" ")[1];
        if (!token) {
            throw new Error("Token not found");
        }
        const user = await jwt.verify(token);
        if (!user) {
            throw new Error("Token is invalid");
        }
        const userInDb = await em.findOne(User, {
            id: user.id,
            role: user.role,
            storeId: user.storeId
        });
        if (!userInDb) {
            throw new Error("User not found");
        }
        return {user: userInDb};
    }
}
export const isAdmin = () => {
    return async (context: any) => {
        const { user } = await isAuthenticated()(context);

        if (user.role!=="admin") {
            throw new Error("Permission denied: Admin access required");
        }

        return { user };
    }
}
export const isAdminOrStaff = () => {
    return async (context: any) => {
        const { user } = await isAuthenticated()(context);

        if (user.role !== "admin" && user.role !== "staff") {
            throw new Error("Permission denied: Admin or Staff access required");
        }

        return { user };
    }
}