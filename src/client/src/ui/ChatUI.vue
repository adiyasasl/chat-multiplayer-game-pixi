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
.ui-overlay { position: absolute; inset: 0; pointer-events: none; }
.chat-panel { position: absolute; bottom: 20px; left: 20px; width: 300px; background: rgba(0,0,0,0.7); border: 1px solid #444; display: flex; flex-direction: column; pointer-events: auto; }
.messages { height: 200px; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 14px; color: white; display: flex; flex-direction: column; gap: 5px; }
.username { color: #ffcc00; font-weight: bold; margin-right: 5px; }
.text { color: #fff; }
input { background: rgba(0,0,0,0.9); border: none; border-top: 1px solid #444; color: white; padding: 10px; font-family: monospace; outline: none; }
input:focus { background: rgba(30,30,30,0.9); }
</style>