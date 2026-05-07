import { Container, Graphics } from 'pixi.js';

export class SpawnerEntity {
  constructor(screenWidth, screenHeight) {
    this.container = new Container();
    const graphicsTop = new Graphics();
    const graphicsBottom = new Graphics();
    const graphicsLeft = new Graphics();
    const graphicsRight = new Graphics();

    const thickness = 10; // Thickness of the borders

    // --- PixiJS v8 Syntax ---
    // Top border
    graphicsTop.rect(0, 0, screenWidth, thickness); 
    
    // Bottom border (Y is screen height minus the thickness)
    graphicsBottom.rect(0, screenHeight - thickness, screenWidth, thickness); 

    // Left border
    graphicsLeft.rect(0, 0, thickness, screenHeight);

    // Right border (X is screen width minus the thickness)
    graphicsRight.rect(screenWidth - thickness, 0, thickness, screenHeight);

    // Fill all the rectangles we just defined with green
    graphicsTop.fill(0x00ff00);
    graphicsBottom.fill(0x00ff00);
    graphicsLeft.fill(0x00ff00);
    graphicsRight.fill(0x00ff00);

    this.container.addChild(graphicsTop);
    this.container.addChild(graphicsBottom);
    this.container.addChild(graphicsLeft);
    this.container.addChild(graphicsRight);
  }
}