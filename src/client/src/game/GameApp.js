// GameApp.js — Your GameManager / SceneManager
import { Application } from 'pixi.js';
import { LoginScene } from './scenes/LoginScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { AssetLoader } from '../util/AssetLoader.js';

class GameApp {
  constructor() {
    this.app = null;
    this.currentSceneInstance = null;
    this.callbacks = {};
  }

  // Like Unity's Awake()
  async init(container, callbacks) {
    // Load assets before starting the first scene
    await AssetLoader.loadAssets();
    
    this.callbacks = callbacks;
    this.app = new Application();
    
    // PixiJS 8 requires async init
    await this.app.init({ background: '#1a1a2e', resizeTo: window });
    container.appendChild(this.app.canvas);

    this.switchScene('login');
  }

  // Like SceneManager.LoadScene()
  async switchScene(sceneName, data = null) {
    if (this.currentSceneInstance) {
      this.currentSceneInstance.destroy();
    }

    this.callbacks.onSceneChange(sceneName);

    if (sceneName === 'login') {
      this.currentSceneInstance = new LoginScene(this);
    } else if (sceneName === 'lobby') {
      this.currentSceneInstance = new LobbyScene(this, data);
    }

    await this.currentSceneInstance.init();
  }
}

export const gameApp = new GameApp();