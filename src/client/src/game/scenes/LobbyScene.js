import { PlayerEntity } from '../entities/PlayerEntity.js';
import { CoinEntity } from '../entities/CoinEntity.js';
import { SpawnerEntity } from '../entities/SpawnerEntity.js';
import { gqlClient } from '../managers/GraphQLClient.js';
import { networkManager } from '../managers/NetworkManager.js';
import { TilingSprite, Texture } from 'pixi.js';

export class LobbyScene {
  constructor(gameManager, data) {
    this.gameManager = gameManager;
    this.app = gameManager.app;
    this.localPlayerData = data.localPlayer;
    this.playerEntities = new Map();
    this.keys = new Set();
    this.coins = []; // ADD THIS: Create an array to track active coins
    this.background = new TilingSprite(Texture.from('/assets/Gray.png'), this.app.screen.width, this.app.screen.height);

    this.coinSpawnTimer = 0;
    this.coinSpawnInterval = 2000; // Time in milliseconds (2000ms = 2 seconds)
    
    // UPDATED: Ignore input if the user is typing in the chat box!
    // (Like Unity's EventSystem.current.currentSelectedGameObject)
    this.handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      this.keys.add(e.key.toLowerCase());
    };
    
    this.handleKeyUp = (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      this.keys.delete(e.key.toLowerCase());
    };
    
    this.updateLoop = this.update.bind(this);
  }

  async init() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const activePlayers = await gqlClient.getPlayers();
    activePlayers.forEach(p => {
      this.spawnPlayer(p, p.id === this.localPlayerData.id);
    });
    this.spawnCoin(); // Spawn a coin whenever a new player joins
    this.spawnSpawner(); // Spawn a spawner in the lobby
    this.updateVueHUD();

    networkManager.connect(this.localPlayerData.id);

    networkManager.on('player_joined', (data) => {
      if (data.player.id !== this.localPlayerData.id) {
        this.spawnPlayer(data.player, false);
        this.updateVueHUD();
      }
    });

    networkManager.on('player_left', (data) => {
      this.removePlayer(data.playerId);
      this.updateVueHUD();
    });

    networkManager.on('player_moved', (data) => {
      const entity = this.playerEntities.get(data.playerId);
      if (entity && !entity.isLocal) entity.setTargetPosition(data.x, data.y);
    });

    // NEW: Listen for incoming chat messages (ClientRpc)
    networkManager.on('chat_message', (data) => {
      this.gameManager.callbacks.onChatMessage(data);
    });

    networkManager.on('score_update', (data) => {
      // Find the remote player who just scored
      const entity = this.playerEntities.get(data.playerId);
      
      if (entity && entity.scoreManager) {
        entity.scoreManager.state.score = data.score;
      }
    });

    this.app.ticker.add(this.updateLoop);
  }

  // NEW: Send a chat message to the server (ServerRpc)
  sendChat(text) {
    if (networkManager.ws && networkManager.ws.readyState === WebSocket.OPEN) {
      networkManager.ws.send(JSON.stringify({ type: 'chat', text }));
    }
  }

  update(ticker) {
    this.coinSpawnTimer += ticker.deltaMS;
    if (this.coinSpawnTimer >= this.coinSpawnInterval) {
      this.spawnCoin();
      this.coinSpawnTimer = 0;
    }

    this.playerEntities.forEach(entity => {
      // Pass 'this.coins' as the third argument
      const didLocalMove = entity.update(ticker, this.keys, this.coins); 
      
      if (didLocalMove && networkManager.ws.readyState === WebSocket.OPEN) {
        networkManager.ws.send(JSON.stringify({
          type: 'move', x: entity.container.x, y: entity.container.y
        }));
      }
    });

    // Note: We loop backwards (from the end of the array to the start). 
    // This is the safest way to iterate through an array when you might be deleting items from it!
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      
      // Move the coin
      coin.update(ticker);

      // Check if the coin flew off-screen
      if (coin.isDead) {
        coin.destroy(); // Remove visual from Pixi
        this.coins.splice(i, 1); // Remove from our array tracking
      }
    }
  }

  spawnPlayer(playerData, isLocal) {
    if (this.playerEntities.has(playerData.id)) return;
    const entity = new PlayerEntity(playerData, isLocal);

    // --- ADD THIS ---
    // If the server sends an initial score, set it right away
    if (playerData.score !== undefined && entity.scoreManager) {
       entity.scoreManager.state.score = playerData.score;
    }

    this.app.stage.addChild(entity.container);
    this.playerEntities.set(playerData.id, entity);

    console.log(`Player ${playerData.username} has joined the lobby!`);

    entity.init();
  }

  spawnCoin() {
    // Pass the screen width and height to the constructor!
    const coin = new CoinEntity(this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(coin.container);
    this.coins.push(coin);

    console.log('A new moving coin has spawned!');
  }

  spawnSpawner() {
    const spawner = new SpawnerEntity(this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(spawner.container);
    console.log('A new spawner has been created in the lobby!');
  }

  removePlayer(playerId) {
    const entity = this.playerEntities.get(playerId);
    if (entity) {
      entity.destroy();
      this.playerEntities.delete(playerId);
    }
  }

  updateVueHUD() {
    const playersList = Array.from(this.playerEntities.values()).map(e => {
      return { 
        id: e.id, 
        username: e.username,
        // Pass the entire reactive state object directly!
        scoreState: e.scoreManager ? e.scoreManager.state : { score: 0 }
      };
    });
    
    this.gameManager.callbacks.onPlayersUpdate(playersList);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.app.ticker.remove(this.updateLoop);
    networkManager.disconnect();
    this.playerEntities.forEach(entity => entity.destroy());
    this.playerEntities.clear();
  }
}