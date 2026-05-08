// GameApp.js
import { Application, Sprite, Assets } from 'pixi.js';
import { LoginScene } from './scenes/LoginScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { AssetLoader } from '../util/AssetLoader.js';

class GameApp {
  constructor() {
    this.app = null;
    this.currentSceneInstance = null;
    this.callbacks = {};
    this.backgroundSprite = null;
  }

  async init(container, callbacks) {
    await AssetLoader.loadAssets();
    
    this.callbacks = callbacks;
    this.app = new Application();
    
    await this.app.init({ background: '#1a1a2e', resizeTo: window });
    container.appendChild(this.app.canvas);

    // --- Setup Global Background ---
    const bgTexture = Assets.get('bg'); 
    this.backgroundSprite = new Sprite(bgTexture);
    
    // 1. Set anchor to the center of the sprite so it scales outward evenly
    this.backgroundSprite.anchor.set(0.5);
    
    this.app.stage.addChild(this.backgroundSprite);

    // 2. Call our new resize function for the initial setup
    this.resizeBackground();

    // 3. Listen for window resizes and update the background
    window.addEventListener('resize', () => {
        this.resizeBackground();
    });
    // ----------------------------------

    this.switchScene('login');
  }

  // --- New Method: Handle Aspect Ratio Scaling ---
  resizeBackground() {
    if (!this.backgroundSprite || !this.app) return;

    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;

    // Get the original dimensions of your background image
    const textureWidth = this.backgroundSprite.texture.width;
    const textureHeight = this.backgroundSprite.texture.height;

    // Calculate how much we need to scale on each axis to fill the screen
    const scaleX = screenWidth / textureWidth;
    const scaleY = screenHeight / textureHeight;

    // Use Math.max to ensure the background covers the entire screen (Cover method)
    // If you want the whole image to always be visible (Contain method), use Math.min instead
    const scale = Math.max(scaleX, scaleY);

    // Apply the uniform scale
    this.backgroundSprite.scale.set(scale);

    // Keep the background perfectly centered in the window
    this.backgroundSprite.x = screenWidth / 2;
    this.backgroundSprite.y = screenHeight / 2;
  }

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