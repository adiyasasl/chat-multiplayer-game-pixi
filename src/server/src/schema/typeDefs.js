// typeDefs.js — GraphQL Schema (Your API Contract)
export default `#graphql
  type Player {
    id: ID!
    username: String!
    x: Float!
    y: Float!
    createdAt: String!
  }

  type Query {
    getPlayers: [Player!]!
  }

  type Mutation {
    joinGame(username: String!): Player!
    leaveGame(id: ID!): Boolean!
  }
`;