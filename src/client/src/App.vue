<template>
  <div id="app-root">
    <div id="game-container" ref="gameContainer"></div>

    <LoginUI v-if="currentScene === 'login'" @join="handleJoin" />
    <LobbyUI v-if="currentScene === 'lobby'" :players="players" />
    
    <!-- NEW: Render Chat UI only in Lobby -->
    <ChatUI v-if="currentScene === 'lobby'" :messages="chatMessages" @send="handleSendChat" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import LoginUI from './ui/LoginUI.vue';
import LobbyUI from './ui/LobbyUI.vue';
import ChatUI from './ui/ChatUI.vue'; // Import the new component
import { gameApp } from './game/GameApp.js';

const gameContainer = ref(null);
const currentScene = ref('login');
const players = ref([]);
const chatMessages = ref([]); // NEW: State for chat messages

onMounted(async () => {
  await gameApp.init(gameContainer.value, {
    onSceneChange: (sceneName) => { currentScene.value = sceneName; },
    onPlayersUpdate: (updatedPlayers) => { players.value = updatedPlayers; },
    
    // NEW: Callback for when the NetworkManager receives a chat
    onChatMessage: (msg) => { chatMessages.value.push(msg); }
  });
});

const handleJoin = (username) => {
  gameApp.currentSceneInstance.submitLogin(username);
};

// NEW: Pass UI text to the active scene
const handleSendChat = (text) => {
  if (gameApp.currentSceneInstance && gameApp.currentSceneInstance.sendChat) {
    gameApp.currentSceneInstance.sendChat(text);
  }
};
</script>

<style>
body { margin: 0; overflow: hidden; background-color: #000; }
#app-root { position: relative; width: 100vw; height: 100vh; }
#game-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
</style>