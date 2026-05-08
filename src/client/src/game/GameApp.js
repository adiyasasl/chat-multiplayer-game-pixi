// GameApp.js — Your GameManager / SceneManager
import { Application, Sprite, Assets } from 'pixi.js'; // Added Sprite and Assets
import { LoginScene } from './scenes/LoginScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { AssetLoader } from '../util/AssetLoader.js';

class GameApp {
  constructor() {
    this.app = null;
    this.currentSceneInstance = null;
    this.callbacks = {};
    this.backgroundSprite = null; // Store a reference to the background
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

    // --- Add the Global Background ---
    // Grab the texture using the alias defined in your AssetLoader
    const bgTexture = Assets.get('bg'); 
    this.backgroundSprite = new Sprite(bgTexture);
    
    // Scale the background to fill the initial screen size
    this.backgroundSprite.width = this.app.screen.width;
    this.backgroundSprite.height = this.app.screen.height;

    // Add it to the main stage FIRST so it renders behind all scenes
    this.app.stage.addChild(this.backgroundSprite);
    // ----------------------------------

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

    // Ensure scenes add their containers to this.app.stage
    // so they render ON TOP of the global background Sprite.
    await this.currentSceneInstance.init();
  }
}

export const gameApp = new GameApp();