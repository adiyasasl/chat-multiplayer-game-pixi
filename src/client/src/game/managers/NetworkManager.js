// NetworkManager.js — Like Unity Netcode's NetworkManager
class NetworkManager {
  constructor() {
    this.ws = null;
    this.listeners = {};
  }

  connect(playerId) {
    this.ws = new WebSocket('ws://chat-multiplayer-game-pixi.onrender.com');
    
    this.ws.onopen = () => {
      // Send initial join payload (Like OnClientConnect)
      this.ws.send(JSON.stringify({ type: 'join', playerId }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.listeners[data.type]) {
        this.listeners[data.type].forEach(cb => cb(data));
      }
    };
  }

  on(eventType, callback) {
    if (!this.listeners[eventType]) this.listeners[eventType] = [];
    this.listeners[eventType].push(callback);
  }

  disconnect() {
    if (this.ws) this.ws.close();
  }
}

export const networkManager = new NetworkManager();