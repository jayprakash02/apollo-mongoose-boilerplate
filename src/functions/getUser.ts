import { IUser, User } from "../user/user.model"
import jwt from "jsonwebtoken";
import { GraphQLError } from 'graphql';



const SECRET: string = process.env.SECRET || 'debug-mode';

export default async function (token: string | undefined): Promise<IUser> {
    try {
        if (token) {
            const decode: any = jwt.verify(token, SECRET)
            const user = await User.findOne({ uid: decode.id })
            if (user)
                return user;
            else
                throw new Error('You are not authorized to perform this action.')
        }
        else
            throw new Error('You are not authorized to perform this action.')


    }
    catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: 'FORBIDDEN',
            },
        });
    }
}