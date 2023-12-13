import { Schema, model, Document } from "mongoose";

interface IUser extends Document {
    uid: string;
    username?: string;
    email?: string;
    given_name?: string;
    middle_name?: string;
    name?: string;
    family_name?: string;
    nickname?: string;
    phone_number?: string;
    comment?: string;
    picture?: string;
    directory?: string;
    tags?: [string];
    is_suspended?: boolean;
}

const userSchema = new Schema<IUser>(
    {
        uid: { type: String, required: true },
        username: { type: String, required: false },
        email: { type: String, required: false },
        given_name: { type: String, required: false },
        middle_name: { type: String, required: false },
        name: { type: String, required: false },
        family_name: { type: String, required: false },
        nickname: { type: String, required: false },
        phone_number: { type: String, required: false },
        comment: { type: String, required: false },
        picture: { type: String, required: false },
        directory: { type: String, required: false },
        tags: { type: [String], required: false },
        is_suspended: { type: Boolean, required: false },
    },
    {
        timestamps: true,
    }
);

const User = model<IUser>('User', userSchema);

export { IUser, User };
