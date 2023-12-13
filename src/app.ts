import mongoose from "mongoose";
import { makeExecutableSchema } from '@graphql-tools/schema'
import { merge } from 'lodash';
import { DocumentNode, GraphQLSchema } from "graphql";
import Controller from "./interface/controller.interface";

import { ApolloServer } from '@apollo/server';
import CustomContext from "./interface/basecontext.interface";
import gql from "graphql-tag";
import express, { Express } from "express";
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { expressMiddleware } from '@apollo/server/express4';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

export default class App {

    public connection: { graphQL: { url?: string }, db_connection: Boolean } = { graphQL: {}, db_connection: false };

    private app: Express = express();
    private path: string = '/'
    private httpServer: any = http.createServer(this.app);

    private gqlServer: ApolloServer<CustomContext>;

    private wsServer: WebSocketServer = new WebSocketServer({
        server: this.httpServer,
        path: this.path,
    });


    constructor(controllers: Controller[]) {
        this.initialized(controllers)

        const schema: GraphQLSchema = this.createSchema(controllers);

        const serverCleanup = useServer({
            schema, context: async (ctx, msg, args) => {
                // You can define your own function for setting a dynamic context
                // or provide a static value
                return this.getDynamicContext(ctx, msg, args);
            },
        }, this.wsServer);


        this.gqlServer = new ApolloServer<CustomContext>({
            schema, plugins: [
                ApolloServerPluginDrainHttpServer({
                    httpServer: this.httpServer
                }),
                {
                    serverWillStart: async () => {
                        return {
                            drainServer: async () => {
                                await serverCleanup.dispose();
                            },
                        };
                    }
                }
            ],
        });
    }

    private getDynamicContext = async (ctx: any, msg: any, args: any) => {
        // ctx is the graphql-ws Context where connectionParams live
        return ({
            token: ctx.connectionParams.Authorization && ctx.connectionParams.Authorization.startsWith('Bearer') ?
                ctx.connectionParams.Authorization.split(' ')[1] :
                null
        });

    }

    private initialized = async (controllers: Controller[]) => {
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
            const DB_USER: string = process.env.DB_USER || 'user123';
            const DB_PASSWORD: string = process.env.DB_PASSWORD || 'user123';
            const DB_HOST: string = process.env.DB_HOST || 'localhost';
            const DB_PORT: string = process.env.DB_PORT || '27017';
            const DB_NAME: string = process.env.DB_NAME || 'test';

            if (DB_USER === '' || DB_PASSWORD === '') {
                throw new Error('DB_USER or DB_PASSWORD is not set in environment');
            }

            // const connectionString = `mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
            const connectionString = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

            mongoose.set('strictQuery', false);
            return await mongoose.connect(connectionString);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }

    public async listen(PORT: number = 3000) {

        await this.gqlServer.start();

        this.app.use(
            this.path,
            cors<cors.CorsRequest>(),
            bodyParser.json(),
            // expressMiddleware accepts the same arguments:
            // an Apollo Server instance and optional configuration options
            expressMiddleware(this.gqlServer, {
                context: async ({ req }) => {
                    return ({
                        token: req.headers.authorization && req.headers.authorization.startsWith('Bearer') ?
                            req.headers.authorization.split(' ')[1] :
                            null
                    });
                },
            })
        );

        await new Promise<void>((resolve) => this.httpServer.listen({ port: PORT }, resolve));


        console.log(`🚀 Server ready at http://localhost:${PORT}${this.path}`);
    }
}

