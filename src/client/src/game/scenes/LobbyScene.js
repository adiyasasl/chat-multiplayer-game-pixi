import { PlayerEntity } from "../entities/PlayerEntity.js";
import { CoinEntity } from "../entities/CoinEntity.js";
import { SpawnerEntity } from "../entities/SpawnerEntity.js";
import { gqlClient } from "../managers/GraphQLClient.js";
import { networkManager } from "../managers/NetworkManager.js";
import { TilingSprite, Texture, Container } from "pixi.js"; // IMPORT Container
import { VirtualJoystick } from "../Controller/VirtualJoystick.js"; 

export class LobbyScene {
  constructor(gameManager, data) {
    this.gameManager = gameManager;
    this.app = gameManager.app;
    this.localPlayerData = data.localPlayer;
    this.playerEntities = new Map();
    this.keys = new Set();
    this.coins = [];

    // --- CAMERA SETUP ---
    // 1. World Container (Moves around)
    this.worldContainer = new Container();
    // 2. UI Container (Stays fixed on screen)
    this.uiContainer = new Container();

    // Map Dimensions (Make this larger than your screen so the camera can pan)
    this.mapWidth = 2000;
    this.mapHeight = 2000;

    this.background = new TilingSprite(
      Texture.from("/assets/Gray.png"),
      this.mapWidth,   // Make background span the whole map
      this.mapHeight,
    );

    this.background.tileScale.set(0.5); // Adjust this to make the grid smaller or larger
    
    // Add background to world
    this.worldContainer.addChild(this.background);

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
    // Add containers to the main stage
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    const activePlayers = await gqlClient.getPlayers();
    activePlayers.forEach((p) => {
      this.spawnPlayer(p, p.id === this.localPlayerData.id);
    });
    this.spawnCoin();
    this.spawnSpawner();
    this.updateVueHUD();

    // Add Virtual Joystick to the UI Container
    this.joystick = new VirtualJoystick(this.app, 60);
    this.uiContainer.addChild(this.joystick);

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
      this.evaluateLeader(); 
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
        this.evaluateLeader(); 
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

    const axis = this.joystick ? this.joystick.axis : { x: 0, y: 0 };
    
    // Pass the actual map size to bounds, NOT the screen size
    const bounds = { width: this.mapWidth, height: this.mapHeight };

    this.playerEntities.forEach((entity) => {
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

    // --- CAMERA LOGIC ---
    const localPlayer = this.playerEntities.get(this.localPlayerData.id);
    
    if (localPlayer) {
      // 1. Calculate where the camera should be so the player is centered
      const targetCamX = (this.app.screen.width / 2) - localPlayer.container.x;
      const targetCamY = (this.app.screen.height / 2) - localPlayer.container.y;

      // 2. Smoothly move the world container (Lerp)
      const cameraLerpSpeed = 0.1 * ticker.deltaTime;
      this.worldContainer.x += (targetCamX - this.worldContainer.x) * cameraLerpSpeed;
      this.worldContainer.y += (targetCamY - this.worldContainer.y) * cameraLerpSpeed;

      // 3. Clamp camera to Map Bounds (Prevents seeing outside the map background)
      if (this.worldContainer.x > 0) this.worldContainer.x = 0;
      if (this.worldContainer.y > 0) this.worldContainer.y = 0;

      const minCamX = this.app.screen.width - this.mapWidth;
      const minCamY = this.app.screen.height - this.mapHeight;

      if (this.worldContainer.x < minCamX) this.worldContainer.x = minCamX;
      if (this.worldContainer.y < minCamY) this.worldContainer.y = minCamY;
    }
  }

  spawnPlayer(playerData, isLocal) {
    if (this.playerEntities.has(playerData.id)) return;
    const entity = new PlayerEntity(playerData, isLocal);

    if (playerData.score !== undefined && entity.scoreManager) {
      entity.scoreManager.state.score = playerData.score;
    }

    // Add to WORLD container instead of app.stage
    this.worldContainer.addChild(entity.container);
    this.playerEntities.set(playerData.id, entity);
    console.log(`Player ${playerData.username} has joined the lobby!`);
    entity.init();
  }

  spawnCoin() {
    // Pass map dimensions to the coin so they spawn everywhere in the world
    const coin = new CoinEntity(this.mapWidth, this.mapHeight);
    
    // Add to WORLD container instead of app.stage
    this.worldContainer.addChild(coin.container);
    this.coins.push(coin);
  }

  spawnSpawner() {
    const spawner = new SpawnerEntity(this.mapWidth, this.mapHeight);
    // Add to WORLD container instead of app.stage
    this.worldContainer.addChild(spawner.container);
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
        isLocal: e.isLocal
      };
    });
    this.gameManager.callbacks.onPlayersUpdate(playersList);
  }

  evaluateLeader() {
    let highestScore = 0;
    let leaderId = null;

    this.playerEntities.forEach((entity) => {
      const score = entity.scoreManager ? entity.scoreManager.state.score : 0;
      if (score > highestScore && score > 0) {
        highestScore = score;
        leaderId = entity.id;
      }
    });

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

    if (this.joystick) {
      this.joystick.destroy({ children: true });
    }
  }
}