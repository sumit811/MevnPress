<script setup>
import { X } from '@lucide/vue';
import { useNotificationStore } from '../stores/notifications';

const notifications = useNotificationStore();
</script>

<template>
  <div
    v-if="notifications.message"
    class="notification-bar"
    :class="`notification-bar--${notifications.type}`"
    role="alert"
    :aria-live="notifications.type === 'error' ? 'assertive' : 'polite'"
  >
    <span>{{ notifications.message }}</span>
    <button class="notification-bar__close" type="button" aria-label="Dismiss notification" @click="notifications.dismiss">
      <X :size="16" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.notification-bar {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-left: 4px solid #00a32a;
  background: #fff;
  box-shadow: 0 1px 1px rgba(0, 0, 0, .04);
  color: #1d2327;
}

.notification-bar--error {
  border-left-color: #d63638;
  background: #fcf0f1;
  color: #8a2424;
}

.notification-bar__close {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 2px;
  color: #646970;
  background: transparent;

  &:hover {
    color: #1d2327;
    background: #f0f0f1;
  }
}
</style>
