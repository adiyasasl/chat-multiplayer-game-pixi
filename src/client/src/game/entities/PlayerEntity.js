import { AnimatedSprite, Container, Graphics, Text, TextStyle, Assets, Spritesheet } from 'pixi.js';
import { ScoreManager } from '../managers/ScoreManager';
import { Collision } from '../../util/Collision';
import { networkManager } from '../managers/NetworkManager';
import { Viewport } from 'pixi-viewport';

export class PlayerEntity {
  constructor(playerData, isLocal = false) {
    this.id = playerData.id;
    this.username = playerData.username;
    this.isLocal = isLocal;
    this.speed = 5;
    
    this.targetX = playerData.x || 400;
    this.targetY = playerData.y || 300;

    this.Viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 2000,
      worldHeight: 2000,
      interaction: networkManager.app.renderer.plugins.interaction
    });

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

    // --- ADD THIS CROWN CODE ---
    this.crown = new Text({ text: '👑', style: { fontSize: 24 } });
    this.crown.anchor.set(0.5);
    this.crown.y = -60; // Place it above their name
    this.crown.visible = false; // Hidden by default
    this.container.addChild(this.crown);
    // ---------------------------

    this.container.addChild(this.graphics);
    this.container.addChild(this.nameText);

    this.sheetWalk = null;
    this.sheetIdle = null;
    this.animSprite = null;
    this.currentState = 'idle';

    // --- ADD THIS FOR JUICE ---
    this.baseScale = 2; // Your default sprite scale
    this.juiceTimer = 0; // Tracks the animation time
    this.juiceDuration = 150; // How long the pop lasts in milliseconds

    this.Viewport.drag().pinch().wheel().follow(this.graphics);
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
  update(ticker, keys, coins, joystickAxis = { x: 0, y: 0 }, bounds = { width: 2000, height: 2000 }) {
    if (this.isLocal) {
      let moved = false;
      let moveX = 0;
      let moveY = 0;

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

      // 3. Calculate Juice Scale
      // ----------------------------------------------------
      let currentScale = this.baseScale;
      
      if (this.juiceTimer > 0) {
        this.juiceTimer -= ticker.deltaMS;
        
        // Calculate progress from 1 (start) down to 0 (end)
        const progress = Math.max(0, this.juiceTimer / this.juiceDuration);
        
        // This makes the scale jump up by 1.0 (to 3.0), then smoothly shrink back to 2.0
        currentScale = this.baseScale + (progress * 1.0); 
      }
      // ----------------------------------------------------

      // 4. Apply Movement & Clamping
      if (moveX !== 0 || moveY !== 0) {
        // Apply the speed
        this.container.x += moveX * this.speed;
        this.container.y += moveY * this.speed;

        // --- ADD THIS: BOUNDARY CLAMPING ---
        // Padding prevents half the frog from clipping through the wall before stopping.
        // 30 is roughly half the width of your scaled sprite. Adjust if needed!
        const padding = 30; 

        // Clamp X (Left and Right walls)
        if (this.container.x < padding) this.container.x = padding;
        if (this.container.x > bounds.width - padding) this.container.x = bounds.width - padding;

        // Clamp Y (Top and Bottom walls)
        if (this.container.y < padding) this.container.y = padding;
        if (this.container.y > bounds.height - padding) this.container.y = bounds.height - padding;
        // -----------------------------------

        moved = true;

        // Flip the sprite direction based on movement, using currentScale!
        if (moveX < 0) this.animSprite.scale.set(-currentScale, currentScale);
        if (moveX > 0) this.animSprite.scale.set(currentScale, currentScale);
      } else {
        // If not moving, keep the current facing direction but apply the juice scale
        const facingLeft = this.animSprite.scale.x < 0;
        this.animSprite.scale.set(facingLeft ? -currentScale : currentScale, currentScale);
      }

      this.animSprite.alpha = 1.0; 

      // 5. Handle Coin Collisions
      if (coins && coins.length > 0) {
        for (let i = 0; i < coins.length; i++) {
          const currentCoin = coins[i];
          
          if (Collision.checkCollision(this.container, currentCoin.getContainer())) {
            
            // --- TRIGGER JUICE HERE ---
            this.juiceTimer = this.juiceDuration; 
            // --------------------------

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

      // 6. Update Animation State
      if (moved) {
        this.setAnimation('walk');
      } else {
        this.setAnimation('idle');
      }

      return moved;
      
    } else {
      // Remote Player Lerping Logic
      const lerpSpeed = 0.15 * ticker.deltaTime;
      
      const dx = this.targetX - this.container.x;
      const dy = this.targetY - this.container.y;
      
      this.container.x += dx * lerpSpeed;
      this.container.y += dy * lerpSpeed;

      // Make sure remote players don't override their own scale if you want them to pop later
      if (dx > 0.5) this.animSprite.scale.set(this.baseScale, this.baseScale);
      if (dx < -0.5) this.animSprite.scale.set(-this.baseScale, this.baseScale);

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

  // Add this new method
  setCrown(isLeader) {
    this.crown.visible = isLeader;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}