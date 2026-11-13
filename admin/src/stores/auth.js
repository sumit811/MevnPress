import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_KEY = 'mervnpress.admin-session';

function readSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(readSession());
  const isAuthenticated = computed(() => Boolean(user.value));

  function signIn({ username, password, rememberMe }) {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      throw new Error('Enter your username and password.');
    }

    user.value = { username: normalizedUsername };
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem(STORAGE_KEY);
    storage.setItem(STORAGE_KEY, JSON.stringify(user.value));
  }

  function signOut() {
    user.value = null;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return { user, isAuthenticated, signIn, signOut };
});