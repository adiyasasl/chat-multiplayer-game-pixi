// resolvers.js — Like RPC Handlers wrapping DB calls
import prisma from '../db/prisma.js';

export default {
  Query: {
    getPlayers: async () => {
      return await prisma.player.findMany({ where: { isOnline: true } });
    }
  },
  Mutation: {
    joinGame: async (_, { username }) => {
      // Upsert: Find by username, or create if new. Set online to true.
      const player = await prisma.player.upsert({
        where: { username },
        update: { isOnline: true },
        create: { username, isOnline: true }
      });
      return player;
    },
    leaveGame: async (_, { id }) => {
      await prisma.player.update({
        where: { id },
        data: { isOnline: false }
      });
      return true;
    }
  }
};