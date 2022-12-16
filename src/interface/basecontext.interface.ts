import { BaseContext } from "@apollo/server";
import { Request, Response } from "express";
import { Types } from "mongoose";

export default interface CustomContext extends BaseContext {
    user?: { _id: Types.ObjectId }
}