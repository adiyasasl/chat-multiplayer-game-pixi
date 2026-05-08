<!-- LobbyUI.vue — HUD Overlay -->
<template>
  <div class="ui-overlay lobby-hud">
    <div class="player-list">
      <h3>Players Online ({{ players.length }})</h3>
      <ul>
        <li v-for="p in players" :key="p.id">
          <span class="username">{{ p.username }}</span> 
          <span class="score">| Score: {{ p.scoreState.score }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({ players: Array });
</script>

<style scoped>
.ui-overlay { position: absolute; inset: 0; pointer-events: none; }
.player-list { 
  position: absolute; top: 10px; right: 10px; 
  /* background: rgba(0,0,0,0.7); color: white; padding: 1rem;  */
  font-family: monospace; border: 1px solid #444; 
  pointer-events: auto; min-width: 200px; /* Made slightly wider */
}
ul { list-style: none; padding: 0; margin: 0; }
li { margin-bottom: 5px; display: flex; justify-content: space-between; }
.username { color: #00ffcc; font-weight: bold; }
.score { color: #fbff00; } /* Yellow color for the score */
</style>