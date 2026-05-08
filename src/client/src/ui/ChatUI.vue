<!-- ChatUI.vue — Canvas UI Overlay -->
<template>
  <div class="ui-overlay chat-hud">
    <div class="chat-panel">
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" class="message">
          <span class="username">{{ msg.username }}:</span>
          <span class="text">{{ msg.message }}</span>
        </div>
      </div>
      <input 
        v-model="inputText" 
        @keyup.enter="sendChat" 
        placeholder="Press Enter to chat..." 
        maxlength="100"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({ messages: Array });
const emit = defineEmits(['send']);

const inputText = ref('');
const messagesContainer = ref(null);

// Auto-scroll to bottom when a new message arrives
watch(() => props.messages.length, async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
});

const sendChat = () => {
  if (inputText.value.trim()) {
    emit('send', inputText.value.trim());
    inputText.value = ''; // Clear input
  }
};
</script>

<style scoped>
.ui-overlay { 
  position: absolute; 
  inset: 0; 
  pointer-events: none; 
  /* 1. Use flexbox to push the chat to the bottom left naturally */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  /* 2. Replace absolute left/bottom with padding */
  padding: 20px;
  /* 3. Account for modern smartphone home bars (iOS safe area) */
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.chat-panel { 
  /* 4. Make it responsive: fill up to 300px, but shrink if screen is tiny */
  width: 100%;
  max-width: 300px; 
  /* 5. Prevent chat from covering the whole screen on landscape mobile */
  max-height: 40vh; 
  background: rgba(0,0,0,0.7); 
  border: 1px solid #444; 
  display: flex; 
  flex-direction: column; 
  pointer-events: auto; 
}

.messages { 
  /* 6. Change fixed height to flex so it fills the panel dynamically */
  flex: 1; 
  min-height: 100px;
  overflow-y: auto; 
  padding: 10px; 
  font-family: monospace; 
  font-size: 14px; 
  color: white; 
  display: flex; 
  flex-direction: column; 
  gap: 5px; 
}

.username { color: #ffcc00; font-weight: bold; margin-right: 5px; }
.text { color: #fff; }

input { 
  /* 7. Prevent the input field from ever squishing */
  flex-shrink: 0; 
  background: rgba(0,0,0,0.9); 
  border: none; 
  border-top: 1px solid #444; 
  color: white; 
  padding: 10px; 
  font-family: monospace; 
  outline: none; 
}

input:focus { background: rgba(30,30,30,0.9); }
</style>