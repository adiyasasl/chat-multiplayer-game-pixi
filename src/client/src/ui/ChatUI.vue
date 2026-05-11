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
  display: flex;
  flex-direction: column;
  justify-content: flex-start; 
  align-items: flex-start;
  padding: 20px;
  box-sizing: border-box;
}

.chat-panel { 
  width: 100%;
  max-width: 300px; 
  /* 1. Changed max-height to a fixed height so the box never pushes down */
  height: 10vh; 
  background: rgba(0,0,0,0.7); 
  border: 1px solid #444; 
  display: flex; 
  flex-direction: column; 
  pointer-events: auto; 
}

.messages { 
  flex: 1; 
  /* 2. CRUCIAL FIX: This forces the scrollbar to appear instead of breaking the layout */
  min-height: 0; 
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