// LoginScene.js — Like LoginScene.unity
import { gqlClient } from '../managers/GraphQLClient.js';
import { Text } from 'pixi.js';

export class LoginScene {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.app = gameManager.app;
    this.title = null;
  }

  async init() {
    // PixiJS only draws background/ambiance here. Vue handles the form.
    this.title = new Text({ text: "PixiJS Background Rendering Active", style: { fill: '#333344', fontSize: 20 }});
    this.title.x = 20; this.title.y = 20;
    this.app.stage.addChild(this.title);
  }

  // Called via App.vue -> GameApp -> currentSceneInstance
  async submitLogin(username) {
    try {
      const player = await gqlClient.createOrFindPlayer(username);
      this.gameManager.switchScene('lobby', { localPlayer: player });
    } catch (e) {
      console.error("Login failed:", e);
    }
  }

  destroy() {
    if (this.title) this.title.destroy();
  }
}