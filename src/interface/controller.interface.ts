import { DocumentNode } from "graphql"

export default interface Controller {
    typeDefs: DocumentNode
    resolvers: object
}