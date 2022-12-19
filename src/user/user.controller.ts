import Contorller from "../interface/controller.interface";
import { IUser, User } from "./user.model";
import jwt from "jsonwebtoken";
import CustomContext from "../interface/basecontext.interface";
import gql from "graphql-tag";
import { DocumentNode } from "graphql";
import getuser from "../functions/getUser";
import { subscribe } from "graphql/execution";
import { Types } from "mongoose";

import { RedisPubSub } from 'graphql-redis-subscriptions';
const pubsub = new RedisPubSub();

export default class UserController implements Contorller {
    public token_expiry = '5h';
    public SECRET: string = process.env.SECRET || 'debug-mode';

    public typeDefs: DocumentNode;
    public resolvers: object;

    constructor() {
        this.resolvers = this.getResolvers()
        this.typeDefs = this.getTypeDefs()
    }

    getTypeDefs(): DocumentNode {
        return gql`
        type User {
            _id: ID!
            uid: String!
            username: String
            email: String
            given_name: String
            middle_name: String
            name: String
            family_name: String
            nickname: String
            phone_number: String
            comment: String
            picture: String
            directory: String
            tags: [String]
            is_suspended: Boolean
        }

        input CreateUserInput {
            uid: String!
            username: String
            email: String
            given_name: String
            middle_name: String
            name: String
            family_name: String
            nickname: String
            phone_number: String
            comment: String
            picture: String
            directory: String
            tags: [String]
            is_suspended: Boolean
        }
        
        input UpdateUserInput {
            username: String
            email: String
            given_name: String
            middle_name: String
            name: String
            family_name: String
            nickname: String
            phone_number: String
            comment: String
            picture: String
            directory: String
            tags: [String]
            is_suspended: Boolean
        }

        type Token {
            token:String,
            expiresIn:String
        }

        input CreateToken {
            uid:String
        }

        type Query {
            user:User
            searchUser:[User]
        }

        type Mutation {
            generateToken(input: CreateToken):Token
            createUser(input:CreateUserInput):User
            updateUser(input:UpdateUserInput):User

        }

        type Subscription {
            onUpdateUser:User
        }
        `
    }

    getResolvers(): object {
        return {
            Query: {
                user: (parent: any, args: object, _contextValue: CustomContext) => {
                    if (_contextValue.token) {
                        return getuser(_contextValue.token)
                    }
                },
                searchUser: async (parent: any, args: object, _contextValue: CustomContext) => {
                    return await User.find()
                }

            },

            Mutation: {
                generateToken: (parent: any, args: { input: { uid: string } }, _contextValue: CustomContext) => {
                    return this.getToken(args.input.uid, this.token_expiry)
                },
                createUser: (parent: any, args: { input: object }, _contextValue: CustomContext) => {
                    return User.create(args.input)
                },
                updateUser: async (parent: any, args: { input: object }, _contextValue: CustomContext) => {
                    const user = getuser(_contextValue.token)
                    const new_user = await User.findOneAndUpdate(user, args.input, { new: true },)
                    return this.echo(new_user, `onUpdateUser.${new_user?._id}`);
                },
            },
            Subscription: {
                onUpdateUser: {
                    subscribe: async (parent: any, args: any, _contextValue: CustomContext) => {
                        const user = await getuser(_contextValue.token)
                        return pubsub.asyncIterator(`onUpdateUser.${user._id}`)
                    }
                }
            }



        }


    }

    private getToken = (id: string, exp: string) => {
        return {
            token: jwt.sign({ id }, this.SECRET, {
                expiresIn: exp,
            }),
            expiresIn: exp,
        }
    }

    async echo(output: any, subscriber: string) {
        const data: any = {};
        const key = subscriber.split('.')[0]
        data[key] = output
        pubsub.publish(subscriber, data);
        return output;
    }


    // private searchUser = asyncHandler(async (req: Request, res: Response) => {
    //     let query: any = {};
    //     for (const key in req.query) {
    //         if (key in ['id', 'uid', 'username', 'email', 'given_name', 'middle_name', 'name', 'family_name', 'nickname', 'phone_number', 'comment', 'picture', 'directory', 'tags', 'is_suspended']) {
    //             query[key] = req.query[key]
    //         }
    //     }
    //     let user: IUser[] = await this.user.find(query);

    //     res.json(user)
    // })

}