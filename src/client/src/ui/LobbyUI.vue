<template>
  <div class="ui-overlay lobby-hud">
    <div class="player-list">
      <h3>Players Online ({{ players.length }})</h3>
      <ul>
        <li v-for="(p, index) in sortedPlayers" :key="p.id">
          <span class="username">
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
import { computed } from "vue"; // Import computed from Vue

const props = defineProps({ players: Array });

// Create a sorted version of the players array
const sortedPlayers = computed(() => {
  // We use [...props.players] to create a copy before sorting.
  // Vue will throw a warning if you try to sort a prop directly!
  return [...props.players].sort((a, b) => {
    const scoreA = a.scoreState?.score || 0;
    const scoreB = b.scoreState?.score || 0;

    // Sort descending (highest to lowest)
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
.username {
  color: #00ffcc;
  font-weight: bold;
}
.score {
  color: #fbff00;
}
</style>
