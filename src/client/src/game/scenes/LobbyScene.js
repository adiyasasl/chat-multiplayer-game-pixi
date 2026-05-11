import { PlayerEntity } from "../entities/PlayerEntity.js";
import { CoinEntity } from "../entities/CoinEntity.js";
import { SpawnerEntity } from "../entities/SpawnerEntity.js";
import { gqlClient } from "../managers/GraphQLClient.js";
import { networkManager } from "../managers/NetworkManager.js";
import { TilingSprite, Texture } from "pixi.js";
import { VirtualJoystick } from "../Controller/VirtualJoystick.js"; // Adjust path if needed

export class LobbyScene {
  constructor(gameManager, data) {
    this.gameManager = gameManager;
    this.app = gameManager.app;
    this.localPlayerData = data.localPlayer;
    this.playerEntities = new Map();
    this.keys = new Set();
    this.coins = [];
    this.background = new TilingSprite(
      Texture.from("/assets/Gray.png"),
      this.app.screen.width,
      this.app.screen.height,
    );

    this.coinSpawnTimer = 0;
    this.coinSpawnInterval = 500;

    // Joystick reference
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
    
    // ADD THIS: Package the screen dimensions into an object
    const bounds = { width: this.app.screen.width, height: this.app.screen.height };

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

    this.app.stage.addChild(entity.container);
    this.playerEntities.set(playerData.id, entity);
    console.log(`Player ${playerData.username} has joined the lobby!`);
    entity.init();
  }

  spawnCoin() {
    const coin = new CoinEntity(this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(coin.container);
    this.coins.push(coin);
  }

  spawnSpawner() {
    const spawner = new SpawnerEntity(
      this.app.screen.width,
      this.app.screen.height,
    );
    this.app.stage.addChild(spawner.container);
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
