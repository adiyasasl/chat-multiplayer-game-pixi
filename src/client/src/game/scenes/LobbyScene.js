import { PlayerEntity } from "../entities/PlayerEntity.js";
import { CoinEntity } from "../entities/CoinEntity.js";
import { SpawnerEntity } from "../entities/SpawnerEntity.js";
import { gqlClient } from "../managers/GraphQLClient.js";
import { networkManager } from "../managers/NetworkManager.js";
import { TilingSprite, Texture, Container } from "pixi.js"; // <-- Imported Container
import { VirtualJoystick } from "../utils/VirtualJoystick.js";

export class LobbyScene {
  constructor(gameManager, data) {
    this.gameManager = gameManager;
    this.app = gameManager.app;
    this.localPlayerData = data.localPlayer;
    this.playerEntities = new Map();
    this.keys = new Set();
    this.coins = []; 
    
    // 1. Define the World Size
    this.worldWidth = 2000;
    this.worldHeight = 2000;

    // 2. CREATE THE WORLD CONTAINER
    // Everything IN the game goes here. UI goes on the stage.
    this.world = new Container();
    this.app.stage.addChild(this.world);

    // Add background to the WORLD
    this.background = new TilingSprite(
      Texture.from("/assets/Gray.png"),
      this.worldWidth,
      this.worldHeight,
    );
    this.world.addChild(this.background);

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

    const activePlayers = await gqlClient.getPlayers();
    activePlayers.forEach((p) => {
      this.spawnPlayer(p, p.id === this.localPlayerData.id);
    });
    this.spawnCoin(); 
    this.spawnSpawner(); 
    this.updateVueHUD();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;

    if (isMobile) {
      console.log("Mobile device detected. Enabling virtual joystick.");
      this.joystick = new VirtualJoystick(this.app, 60); 
      // Joystick goes on the STAGE so it stays glued to the screen
      this.app.stage.addChild(this.joystick); 
    } else {
      this.joystick = null;
    }

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
        if (entity.setCrown) entity.setCrown(true);
      } else {
        if (entity.setCrown) entity.setCrown(false);
      }
    });
  }

  update(ticker) {
    this.coinSpawnTimer += ticker.deltaMS;
    if (this.coinSpawnTimer >= this.coinSpawnInterval) {
      this.spawnCoin();
      this.coinSpawnTimer = 0;
    }

    const axis = this.joystick ? this.joystick.axis : { x: 0, y: 0 };
    const bounds = { width: this.worldWidth, height: this.worldHeight };

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

    // --- 3. NATIVE CAMERA LOGIC ---
    const localPlayer = this.playerEntities.get(this.localPlayerData.id);
    
    if (localPlayer) {
      // Calculate where the world needs to move to center the player
      let targetCameraX = (this.app.screen.width / 2) - localPlayer.container.x;
      let targetCameraY = (this.app.screen.height / 2) - localPlayer.container.y;

      // Calculate the boundaries so the camera doesn't show the void
      const minCameraX = this.app.screen.width - this.worldWidth;
      const minCameraY = this.app.screen.height - this.worldHeight;

      // Clamp the camera (Math.max prevents it going too far right/down, Math.min prevents too far left/up)
      targetCameraX = Math.max(minCameraX, Math.min(0, targetCameraX));
      targetCameraY = Math.max(minCameraY, Math.min(0, targetCameraY));

      // Apply a smooth Lerp so the camera slightly "drags" behind the player
      const cameraSpeed = 0.1 * ticker.deltaTime;
      this.world.x += (targetCameraX - this.world.x) * cameraSpeed;
      this.world.y += (targetCameraY - this.world.y) * cameraSpeed;
    }
  }

  spawnPlayer(playerData, isLocal) {
    if (this.playerEntities.has(playerData.id)) return;
    const entity = new PlayerEntity(playerData, isLocal);

    if (playerData.score !== undefined && entity.scoreManager) {
      entity.scoreManager.state.score = playerData.score;
    }

    // Add to WORLD, not stage
    this.world.addChild(entity.container);
    this.playerEntities.set(playerData.id, entity);
    entity.init();
  }

  spawnCoin() {
    const coin = new CoinEntity(this.worldWidth, this.worldHeight);
    // Add to WORLD, not stage
    this.world.addChild(coin.container);
    this.coins.push(coin);
  }

  spawnSpawner() {
    const spawner = new SpawnerEntity(this.worldWidth, this.worldHeight);
    // Add to WORLD, not stage
    this.world.addChild(spawner.container);
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