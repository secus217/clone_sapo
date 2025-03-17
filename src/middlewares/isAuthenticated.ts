import User from "../entities/User";
import {initORM} from "../db";
import { jwt } from '@elysiajs/jwt';
const isAuthenticated = (
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
        const user: User = await jwt.verify(token);
        if (!user) {
            throw new Error("Token is invalid");
        }
        const userInDb = await em.findOne(User, {
            id: user.id
        });
        if (!userInDb) {
            throw new Error("User not found");
        }

        return {user: userInDb};
    }
}

export default isAuthenticated