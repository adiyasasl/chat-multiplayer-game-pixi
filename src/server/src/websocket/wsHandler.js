// wsHandler.js — The Authoritative GameManager
import prisma from '../db/prisma.js';

// --- ADD THIS: A temporary memory store for rapid updates ---
const pendingSaves = new Map();

// This function flushes memory to the database every 5 seconds
setInterval(async () => {
  if (pendingSaves.size === 0) return;

  for (const [playerId, data] of pendingSaves.entries()) {
    try {
      await prisma.player.update({
        where: { id: playerId },
        data: data
      });
      // Remove from pending saves once successful
      pendingSaves.delete(playerId);
    } catch (err) {
      console.error(`Failed to background save for ${playerId}:`, err.message);
    }
  }
}, 5000); // 5000 ms = 5 seconds

export default function setupWebSocket(wss) {
  const clients = new Map();

  const broadcast = (data, excludeWs = null) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      const data = JSON.parse(message);

      // --- PLAYER JOINED ---
      if (data.type === 'join') {
        const playerId = data.playerId;
        clients.set(ws, playerId);

        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (player) {
          broadcast({ type: 'player_joined', player }, ws);
        }
      }

      // --- CHAT MESSAGE ---
      if (data.type === 'chat') {
        const playerId = clients.get(ws);
        if (playerId) {
          // Look up the player in the database to get their username
          // (This prevents users from faking someone else's name!)
          const player = await prisma.player.findUnique({ where: { id: playerId } });
          if (player) {
            // Broadcast the message to EVERYONE (including the sender)
            // By passing `null` as the second argument, we do not exclude the sender
            broadcast({
              type: 'chat_message',
              username: player.username,
              message: data.text
            }, null); 
          }
        }
      }

      // --- PLAYER MOVED ---
      if (data.type === 'move') {
        const playerId = clients.get(ws);
        if (playerId) {
          broadcast({
            type: 'player_moved',
            playerId: playerId,
            x: data.x,
            y: data.y
          }, ws);

          // INSTEAD OF PRISMA.UPDATE, DO THIS:
          // Merge new position into the pending saves map
          const currentData = pendingSaves.get(playerId) || {};
          pendingSaves.set(playerId, { ...currentData, x: data.x, y: data.y });
        }
      }

      // --- SCORE UPDATE ---
      if (data.type === 'score_update') {
        const playerId = clients.get(ws);
        if (playerId) {
          broadcast({
            type: 'score_update',
            playerId: playerId,
            score: data.score
          }, ws);

          // INSTEAD OF PRISMA.UPDATE, DO THIS:
          // Merge new score into the pending saves map
          const currentData = pendingSaves.get(playerId) || {};
          pendingSaves.set(playerId, { ...currentData, score: data.score });
        }
      }
    });

    

    ws.on('close', async () => {
      const playerId = clients.get(ws);
      if (playerId) {
        
        // Grab any unsaved data from memory
        const unsavedData = pendingSaves.get(playerId) || {};
        
        // Save everything to DB instantly and mark offline
        await prisma.player.update({
          where: { id: playerId },
          data: { ...unsavedData, isOnline: false }
        }).catch(err => console.error("Disconnect save failed:", err.message));
        
        // Cleanup memory and connections
        pendingSaves.delete(playerId);
        broadcast({ type: 'player_left', playerId });
        clients.delete(ws);
      }
    });
  });
}