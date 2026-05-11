import { AnimatedSprite, Container, Graphics, Text, TextStyle, Assets, Spritesheet } from 'pixi.js';
import { CoinEntity } from './CoinEntity';
import { ScoreManager } from '../managers/ScoreManager';
import { Collision } from '../../util/Collision';
import { networkManager } from '../managers/NetworkManager';

export class PlayerEntity {
  constructor(playerData, isLocal = false) {
    this.id = playerData.id;
    this.username = playerData.username;
    this.isLocal = isLocal;
    this.speed = 5;
    
    this.targetX = playerData.x || 400;
    this.targetY = playerData.y || 300;

    this.container = new Container();
    this.container.x = this.targetX;
    this.container.y = this.targetY;

    this.scoreManager = new ScoreManager();

    const color = this.isLocal ? '#ff0055' : '#00ffcc';

    this.graphics = new Graphics();
    this.graphics.circle(0, 0, 5);
    this.graphics.fill(color);

    this.pointer = new Graphics();
    this.pointer.rect(-5, -70, 10, 20);
    this.pointer.fill(color);
    this.pointer.alpha = 1;
    this.graphics.addChild(this.pointer);
    
    const style = new TextStyle({ fill: '#ffffff', fontSize: 14, fontFamily: 'monospace' });
    this.nameText = new Text({ text: this.username, style });
    this.nameText.anchor.set(0.5);
    this.nameText.y = -35;

    this.container.addChild(this.graphics);
    this.container.addChild(this.nameText);

    this.sheetWalk = null;
    this.sheetIdle = null;
    this.animSprite = null;
    this.currentState = 'idle';

    this.intervalScale = 1;
    this.currentIntervalScale = 0;
    this.collectCoin = false;
  }

  async init() {
    const atlasIdleData = {
      frames: {
        'idle_0': { frame: { x: 0, y: 0, w: 32, h: 32 } },
        'idle_1': { frame: { x: 32, y: 0, w: 32, h: 32 } },
        'idle_2': { frame: { x: 64, y: 0, w: 32, h: 32 } },
        'idle_3': { frame: { x: 96, y: 0, w: 32, h: 32 } },
        'idle_4': { frame: { x: 128, y: 0, w: 32, h: 32 } },
        'idle_5': { frame: { x: 160, y: 0, w: 32, h: 32 } },
        'idle_6': { frame: { x: 192, y: 0, w: 32, h: 32 } },
        'idle_7': { frame: { x: 224, y: 0, w: 32, h: 32 } },
        'idle_8': { frame: { x: 256, y: 0, w: 32, h: 32 } },
        'idle_9': { frame: { x: 288, y: 0, w: 32, h: 32 } },
        'idle_10': { frame: { x: 320, y: 0, w: 32, h: 32 } },
      },
      meta: { image: Assets.get('idle'), size: { w: 352, h: 32 } },
      animations: { idle: ['idle_0', 'idle_1', 'idle_2', 'idle_3', 'idle_4', 'idle_5', 'idle_6', 'idle_7', 'idle_8', 'idle_9', 'idle_10'] }
    };

    const atlasWalkData = {
      frames: {
        'walk_0': { frame: { x: 0, y: 0, w: 32, h: 32 } },
        'walk_1': { frame: { x: 32, y: 0, w: 32, h: 32 } },
        'walk_2': { frame: { x: 64, y: 0, w: 32, h: 32 } },
        'walk_3': { frame: { x: 96, y: 0, w: 32, h: 32 } },
        'walk_4': { frame: { x: 128, y: 0, w: 32, h: 32 } },
        'walk_5': { frame: { x: 160, y: 0, w: 32, h: 32 } },
        'walk_6': { frame: { x: 192, y: 0, w: 32, h: 32 } },
        'walk_7': { frame: { x: 224, y: 0, w: 32, h: 32 } },
        'walk_8': { frame: { x: 256, y: 0, w: 32, h: 32 } },
        'walk_9': { frame: { x: 288, y: 0, w: 32, h: 32 } },
        'walk_10': { frame: { x: 320, y: 0, w: 32, h: 32 } },
        'walk_11': { frame: { x: 352, y: 0, w: 32, h: 32 } },
      },
      meta: { image: Assets.get('walk'), size: { w: 384, h: 32 } },
      animations: { walk: ['walk_0', 'walk_1', 'walk_2', 'walk_3', 'walk_4', 'walk_5', 'walk_6', 'walk_7', 'walk_8', 'walk_9', 'walk_10', 'walk_11'] }
    };

    this.sheetIdle = new Spritesheet(Assets.get('idle'), atlasIdleData);
    await this.sheetIdle.parse();
    this.sheetWalk = new Spritesheet(Assets.get('walk'), atlasWalkData);
    await this.sheetWalk.parse();

    this.animSprite = new AnimatedSprite(this.sheetIdle.animations['idle']);
    this.animSprite.animationSpeed = 0.3;
    this.animSprite.anchor.set(0.5, 0.5);
    this.animSprite.scale.set(2, 2);
    this.animSprite.play();
    this.graphics.addChild(this.animSprite);
  }

  // Accepts the new joystickAxis parameter, defaults to 0
  update(ticker, keys, coins, joystickAxis = { x: 0, y: 0 }) {
    if (this.isLocal) {
      let moved = false;
      let moveX = 0;
      let moveY = 0;

      if (this.collectCoin) {
        this.currentIntervalScale += 0.1 * ticker.deltaTime;
        if (this.currentIntervalScale >= this.intervalScale) {
          this.animSprite.scale.set(this.animSprite.scale.x + 0.3, this.animSprite.scale.y + 0.3);
          this.currentIntervalScale = 0;
          this.collectCoin = false;
        }
      }

      // 1. Check Keyboard Inputs
      if (keys.has('w') || keys.has('ArrowUp'))    moveY -= 1;
      if (keys.has('s') || keys.has('ArrowDown'))  moveY += 1;
      if (keys.has('a') || keys.has('ArrowLeft'))  moveX -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) moveX += 1;

      // Normalize diagonal keyboard movement 
      if (moveX !== 0 && moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
      }

      // 2. Check Joystick Inputs (Overrides keyboard if currently active)
      if (Math.abs(joystickAxis.x) > 0.1 || Math.abs(joystickAxis.y) > 0.1) {
        moveX = joystickAxis.x;
        moveY = joystickAxis.y;
      }

      // 3. Apply Movement
      if (moveX !== 0 || moveY !== 0) {
        this.container.x += moveX * this.speed;
        this.container.y += moveY * this.speed;
        moved = true;

        // Flip the sprite based on x direction
        if (moveX < 0) this.animSprite.scale.set(-2, 2);
        if (moveX > 0) this.animSprite.scale.set(2, 2);
      }

      this.animSprite.alpha = 1.0; 

      // 4. Handle Coin Collisions
      if (coins && coins.length > 0) {
        for (let i = 0; i < coins.length; i++) {
          const currentCoin = coins[i];
          
          if (Collision.checkCollision(this.container, currentCoin.getContainer())) {
            this.collectCoin = true;
            this.animSprite.alpha = 0.5; 
            currentCoin.destroy(); 
            coins.splice(i, 1); 
            this.scoreManager.addScore(currentCoin.getScore()); 

            if (networkManager.ws && networkManager.ws.readyState === WebSocket.OPEN) {
              networkManager.ws.send(JSON.stringify({
                type: 'score_update',
                playerId: this.id, 
                score: this.scoreManager.state.score
              }));
            }
            console.log(`Collected a coin! Current Score: ${this.scoreManager.getScore()}`);
          }
        }
      }

      // 5. Update Animation State
      if (moved) {
        this.setAnimation('walk');
      } else {
        this.setAnimation('idle');
      }

      return moved;
      
    } 
    else {
      if (this.collectCoin) {
        this.currentIntervalScale += 0.1 * ticker.deltaTime;
        if (this.currentIntervalScale >= this.intervalScale) {
          this.animSprite.scale.set(this.animSprite.scale.x + 0.3, this.animSprite.scale.y + 0.3);
          this.currentIntervalScale = 0;
          this.collectCoin = false;
        }
      }
      // Remote Player Lerping Logic
      const lerpSpeed = 0.15 * ticker.deltaTime;
      
      const dx = this.targetX - this.container.x;
      const dy = this.targetY - this.container.y;
      
      this.container.x += dx * lerpSpeed;
      this.container.y += dy * lerpSpeed;

      if (dx > 0.5) this.animSprite.scale.set(2, 2);
      if (dx < -0.5) this.animSprite.scale.set(-2, 2);

      const distSq = (dx * dx) + (dy * dy);
      
      if (distSq > 1.0) { 
        this.setAnimation('walk');
      } else {
        this.setAnimation('idle');
      }

      return false;
    }
  }

  setAnimation(state) {
    if (this.currentState === state) return; 
    
    this.currentState = state;

    if (state === 'walk') {
      this.animSprite.textures = this.sheetWalk.animations['walk'];
    } else if (state === 'idle') {
      this.animSprite.textures = this.sheetIdle.animations['idle'];
    }
    
    this.animSprite.play();
  }

  setTargetPosition(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}