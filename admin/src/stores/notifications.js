import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notifications', {
  state: () => ({ message: '', type: 'success', timeoutId: null }),
  actions: {
    show(message, type = 'success', duration = 5000) {
      this.message = message;
      this.type = type;
      if (this.timeoutId) window.clearTimeout(this.timeoutId);
      if (duration > 0) {
        this.timeoutId = window.setTimeout(() => this.dismiss(), duration);
      }
    },
    success(message, duration = 5000) {
      this.show(message, 'success', duration);
    },
    error(message, duration = 7000) {
      this.show(message, 'error', duration);
    },
    dismiss() {
      if (this.timeoutId) window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.message = '';
    }
  }
});
