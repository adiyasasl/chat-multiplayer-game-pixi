import { Graphics, Container } from "pixi.js";

export class CoinEntity {
  // Pass in the screen width and height so it knows the borders
  constructor(screenWidth = 800, screenHeight = 600, initialScore = 0) {
    this.score = initialScore;
    this.container = new Container();

    this.style = new Graphics();
    this.style.circle(0, 0, 10);

    const randomColor = Math.random() >= 0.5;

    this.style.fill(randomColor ? "#fbff00ff" : "#ff0000ff");
    this.container.addChild(this.style);

    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.isDead = false; // Flag to tell the LobbyScene to delete this

    this.score = randomColor ? 10 : -5; // Yellow coins give +10, Red coins give -5

    // Speed of the coin
    const speed = randomColor ? 3 : 10;
    this.vx = 0;
    this.vy = 0;

    // Pick a random border (0 = Top, 1 = Right, 2 = Bottom, 3 = Left)
    const border = Math.floor(Math.random() * 4);

    // Spawn slightly off-screen (-15) so it smoothly slides into view
    if (border === 0) {
      // Top
      this.container.x = Math.random() * screenWidth;
      this.container.y = -15;
      this.vy = speed; // Move down
    } else if (border === 1) {
      // Right
      this.container.x = screenWidth + 15;
      this.container.y = Math.random() * screenHeight;
      this.vx = -speed; // Move left
    } else if (border === 2) {
      // Bottom
      this.container.x = Math.random() * screenWidth;
      this.container.y = screenHeight + 15;
      this.vy = -speed; // Move up
    } else if (border === 3) {
      // Left
      this.container.x = -15;
      this.container.y = Math.random() * screenHeight;
      this.vx = speed; // Move right
    }
  }

  // New Update Method to handle movement
  update(ticker) {
    // Move the coin
    this.container.x += this.vx * ticker.deltaTime;
    this.container.y += this.vy * ticker.deltaTime;

    // Check if it has fully left the screen on the opposite side (20px padding)
    if (
      this.container.x < -20 ||
      this.container.x > this.screenWidth + 20 ||
      this.container.y < -20 ||
      this.container.y > this.screenHeight + 20
    ) {
      this.isDead = true; // Mark for destruction
    }
  }

  destroy() {
    this.container.destroy({ children: true });
  }

  getContainer() {
    return this.container;
  }

  getScore() {
    return this.score;
  }
}
