<!-- LoginUI.vue — Canvas UI Overlay with ZERO game logic -->
<template>
  <div class="ui-overlay login-screen">
    <div class="panel">
      <h2>Enter Dungeon</h2>
      <input v-model="username" placeholder="Username" @keyup.enter="join" />
      <button @click="join">Join Game</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const emit = defineEmits(['join']);
const username = ref('');

const join = () => {
  if (username.value.trim()) emit('join', username.value.trim());
};
</script>

<style scoped>
.ui-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
.panel { background: rgba(20, 20, 20, 0.9); padding: 2rem; border: 2px solid #555; text-align: center; color: white; font-family: monospace; }
input { margin-bottom: 1rem; padding: 0.5rem; width: 80%; }
button { padding: 0.5rem 1rem; cursor: pointer; }
</style>