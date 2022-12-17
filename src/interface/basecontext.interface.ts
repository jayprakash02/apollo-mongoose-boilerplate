import { BaseContext } from "@apollo/server";
import { Types } from "mongoose";
import { IUser } from "../user/user.model";

export default interface CustomContext extends BaseContext {
    token?: string | undefined
}