// index.js — The Server Entry Point
import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { WebSocketServer } from 'ws';
import cors from 'cors';

import typeDefs from './schema/typeDefs.js';
import resolvers from './resolvers/resolvers.js';
import setupWebSocket from './websocket/wsHandler.js';

const app = express();
const httpServer = createServer(app);

// 1. Setup Apollo Server (GraphQL / API)
const apolloServer = new ApolloServer({ typeDefs, resolvers });
await apolloServer.start();

app.use(cors());
app.use(express.json());
app.use('/graphql', expressMiddleware(apolloServer));

// 2. Setup WebSocket Server (Realtime Netcode)
const wss = new WebSocketServer({ server: httpServer });
setupWebSocket(wss);

// 3. Start Listening
const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  console.log(`🔌 WebSocket server active on ws://localhost:${PORT}`);
});