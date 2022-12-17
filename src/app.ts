import mongoose from "mongoose";
import { makeExecutableSchema } from '@graphql-tools/schema'
import { merge } from 'lodash';
import { DocumentNode, GraphQLSchema } from "graphql";
import Controller from "./interface/controller.interface";

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import CustomContext from "./interface/basecontext.interface";
import gql from "graphql-tag";

export default class App {

    public server: ApolloServer<CustomContext>;
    public connection: { graphQL: { url?: string }, db_connection: Boolean } = { graphQL: {}, db_connection: false };

    constructor(controllers: Controller[]) {
        this.initialized()

        const schema: GraphQLSchema = this.createSchema(controllers);
        this.server = new ApolloServer<CustomContext>({ schema });
    }

    private initialized = async () => {
        this.connection.db_connection = await this.connectToDatabase()
            .then(async (conn) => {
                console.log(`DATABASE CONNECTED TO: ${conn.connection.host}`)
                return true;
            })
    }


    private createSchema = (controllers: Controller[]) => {
        let typeDefs: DocumentNode[] = []
        let resolvers: object[] = []

        controllers.forEach(controller => {
            typeDefs.push(controller.typeDefs)
            resolvers.push(controller.resolvers)
        })


        const customtypeDefs =
            gql`
            type Status {
                status:Boolean,
                message:String
            }
            type Query {
                chechConnection: Status
            }
        `;

        const customresolvers = {
            Query: {
                chechConnection: () => {
                    const status = { status: this.connection.db_connection, message: this.connection.db_connection ? "DB CONNECTED" : "DB NOT CONNECTED" }
                    return status;
                }
            },
        };



        typeDefs.push(customtypeDefs)
        resolvers.push(customresolvers)

        return makeExecutableSchema({ typeDefs: typeDefs, resolvers: merge(resolvers) })
    }


    private async connectToDatabase() {
        try {
            const DB: string = process.env.DB || '';
            if (DB === '') {
                throw new Error('DB is not set in environment');
            }
            mongoose.set('strictQuery', false)
            return await mongoose.connect(DB);
        } catch (error) {
            console.log(error)
            process.exit(1)
        }
    }

    public async listen(PORT: number = 3000) {
        this.connection.graphQL = await startStandaloneServer(this.server, {
            context: async ({ req }) => {
                return ({
                    token: req.headers.authorization && req.headers.authorization.startsWith('Bearer') ?
                        req.headers.authorization.split(' ')[1] :
                        null
                })
            },
            listen: { port: PORT },
        })
        console.log(`GRAPHQL SERVER STARTED AT ${this.connection.graphQL.url} `)
    }
}