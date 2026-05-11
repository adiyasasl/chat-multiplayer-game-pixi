import { PlayerEntity } from "../entities/PlayerEntity.js";
import { CoinEntity } from "../entities/CoinEntity.js";
import { SpawnerEntity } from "../entities/SpawnerEntity.js";
import { gqlClient } from "../managers/GraphQLClient.js";
import { networkManager } from "../managers/NetworkManager.js";
import { TilingSprite, Texture } from "pixi.js";
import { VirtualJoystick } from "../Controller/VirtualJoystick.js"; // Adjust path if needed
import { Viewport } from "pixi-viewport"; // Import the Viewport class

export class LobbyScene {
  constructor(gameManager, data) {
    this.gameManager = gameManager;
    this.app = gameManager.app;
    this.localPlayerData = data.localPlayer;
    this.playerEntities = new Map();
    this.keys = new Set();
    this.coins = []; 
    
    // --- ADD THIS: Define the World Size ---
    this.worldWidth = 2000;
    this.worldHeight = 2000;

    // --- SETUP THE VIEWPORT ---
    this.viewport = new Viewport({
        screenWidth: this.app.screen.width,
        screenHeight: this.app.screen.height,
        worldWidth: this.worldWidth,
        worldHeight: this.worldHeight,
        events: this.app.renderer.events // Required for touch/mouse events
    });
    
    // Add the viewport to the main stage
    this.app.stage.addChild(this.viewport);

    // Update the background to cover the whole WORLD, not just the screen
    this.background = new TilingSprite(
      Texture.from("/assets/Gray.png"),
      this.worldWidth,
      this.worldHeight,
    );
    // Add background to VIEWPORT, not stage
    this.viewport.addChild(this.background);

    this.coinSpawnTimer = 0;
    this.coinSpawnInterval = 500; 
    this.joystick = null;

    this.handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === "input") return;
      this.keys.add(e.key.toLowerCase());
    };

    this.handleKeyUp = (e) => {
      if (e.target.tagName.toLowerCase() === "input") return;
      this.keys.delete(e.key.toLowerCase());
    };

    this.updateLoop = this.update.bind(this);
  }

  async init() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Keep the viewport inside the bounds of the world so you don't see the black void outside
    this.viewport.clamp({ direction: 'all' });

    const activePlayers = await gqlClient.getPlayers();
    activePlayers.forEach((p) => {
      this.spawnPlayer(p, p.id === this.localPlayerData.id);
    });
    this.spawnCoin();
    this.spawnSpawner();
    this.updateVueHUD();

    // Initialize Virtual Joystick
    this.joystick = new VirtualJoystick(this.app, 60);
    this.app.stage.addChild(this.joystick);

    networkManager.connect(this.localPlayerData.id);

    networkManager.on("player_joined", (data) => {
      if (data.player.id !== this.localPlayerData.id) {
        this.spawnPlayer(data.player, false);
        this.updateVueHUD();
      }
    });

    networkManager.on("player_left", (data) => {
      this.removePlayer(data.playerId);
      this.updateVueHUD();
      this.evaluateLeader(); // ADD THIS
    });

    networkManager.on("player_moved", (data) => {
      const entity = this.playerEntities.get(data.playerId);
      if (entity && !entity.isLocal) entity.setTargetPosition(data.x, data.y);
    });

    networkManager.on("chat_message", (data) => {
      this.gameManager.callbacks.onChatMessage(data);
    });

    networkManager.on("score_update", (data) => {
      const entity = this.playerEntities.get(data.playerId);
      if (entity && entity.scoreManager) {
        entity.scoreManager.state.score = data.score;
        this.evaluateLeader(); // ADD THIS
      }
    });

    this.app.ticker.add(this.updateLoop);
  }

  sendChat(text) {
    if (networkManager.ws && networkManager.ws.readyState === WebSocket.OPEN) {
      networkManager.ws.send(JSON.stringify({ type: "chat", text }));
    }
  }

  update(ticker) {
    this.coinSpawnTimer += ticker.deltaMS;
    if (this.coinSpawnTimer >= this.coinSpawnInterval) {
      this.spawnCoin();
      this.coinSpawnTimer = 0;
    }

    // Grab the axis data from the joystick
    const axis = this.joystick ? this.joystick.axis : { x: 0, y: 0 };
    
    // --- UPDATE THIS: Pass the WORLD size instead of screen size to the player clamping ---
    const bounds = { width: this.worldWidth, height: this.worldHeight };

    this.playerEntities.forEach((entity) => {
      // Pass 'bounds' as the 5th parameter
      const didLocalMove = entity.update(ticker, this.keys, this.coins, axis, bounds);

      if (didLocalMove && networkManager.ws.readyState === WebSocket.OPEN) {
        networkManager.ws.send(
          JSON.stringify({
            type: "move",
            x: entity.container.x,
            y: entity.container.y,
          }),
        );
      }
    });

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.update(ticker);
      if (coin.isDead) {
        coin.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  spawnPlayer(playerData, isLocal) {
    if (this.playerEntities.has(playerData.id)) return;
    const entity = new PlayerEntity(playerData, isLocal);

    if (playerData.score !== undefined && entity.scoreManager) {
      entity.scoreManager.state.score = playerData.score;
    }

    // --- UPDATE THIS: Add player to the VIEWPORT ---
    this.viewport.addChild(entity.container);
    
    // --- ADD THIS: Tell the camera to follow the local player! ---
    if (isLocal) {
      this.viewport.follow(entity.container, {
          speed: 10,       // Adjust for smooth camera lag
          acceleration: 0.1,
          radius: 50       // Let the player move 50px before camera starts adjusting
      });
    }

    this.playerEntities.set(playerData.id, entity);
    entity.init();
  }

  spawnCoin() {
    // --- UPDATE THIS: Coins now spawn randomly within the massive WORLD, not just the screen ---
    const coin = new CoinEntity(this.worldWidth, this.worldHeight);
    
    // Add coin to VIEWPORT
    this.viewport.addChild(coin.container);
    this.coins.push(coin);
  }

  spawnSpawner() {
    const spawner = new SpawnerEntity(this.worldWidth, this.worldHeight);
    // Add spawner to VIEWPORT
    this.viewport.addChild(spawner.container);
  }

  removePlayer(playerId) {
    const entity = this.playerEntities.get(playerId);
    if (entity) {
      entity.destroy();
      this.playerEntities.delete(playerId);
    }
  }

  updateVueHUD() {
    const playersList = Array.from(this.playerEntities.values()).map((e) => {
      return {
        id: e.id,
        username: e.username,
        scoreState: e.scoreManager ? e.scoreManager.state : { score: 0 },
        isLocal: e.isLocal // <-- ADD THIS LINE
      };
    });
    this.gameManager.callbacks.onPlayersUpdate(playersList);
  }

  evaluateLeader() {
    let highestScore = 0;
    let leaderId = null;

    // 1. Find the highest score (Must be at least 1 point to get a crown!)
    this.playerEntities.forEach((entity) => {
      const score = entity.scoreManager ? entity.scoreManager.state.score : 0;
      if (score > highestScore && score > 0) {
        highestScore = score;
        leaderId = entity.id;
      }
    });

    // 2. Give the crown to the winner, take it from everyone else
    this.playerEntities.forEach((entity) => {
      if (entity.id === leaderId && leaderId !== null) {
        entity.setCrown(true);
      } else {
        entity.setCrown(false);
      }
    });
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.app.ticker.remove(this.updateLoop);
    networkManager.disconnect();
    this.playerEntities.forEach((entity) => entity.destroy());
    this.playerEntities.clear();

    // Clean up joystick if scene is destroyed
    if (this.joystick) {
      this.joystick.destroy({ children: true });
    }
  }
}
