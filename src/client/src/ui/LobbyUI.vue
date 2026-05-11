<template>
  <div class="ui-overlay lobby-hud">
    <div class="player-list">
      <h3>Players Online ({{ players.length }})</h3>
      <ul>
        <li v-for="(p, index) in sortedPlayers" :key="p.id">
          <span class="username" :class="{ 'local-player': p.isLocal }">
            <span v-if="index === 0 && p.scoreState.score > 0">👑</span>
            {{ p.username }}
          </span>
          <span class="score">| Score: {{ p.scoreState.score }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({ players: Array });

const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    const scoreA = a.scoreState?.score || 0;
    const scoreB = b.scoreState?.score || 0;
    return scoreB - scoreA;
  });
});
</script>

<style scoped>
.ui-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.player-list {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1rem;
  font-family: monospace;
  border: 1px solid #444;
  pointer-events: auto;
  min-width: 200px;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
}
/* Default color for remote players */
.username {
  color: #ffffff; 
  font-weight: bold;
}
/* ADD THIS: Special color for the local player */
.local-player {
  color: #5bd3ff; 
}
.score {
  color: #fbff00;
}
</style>