<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const errorMessage = ref('');

function submitLogin() {
  errorMessage.value = '';
  try {
    auth.signIn({ username: username.value, password: password.value, rememberMe: rememberMe.value });
    router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/');
  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="login-title">
      <a class="auth-brand" href="/login" aria-label="MervnPress login">M</a>
      <div class="auth-heading">
        <p class="auth-eyebrow">MERVNPRESS ADMIN</p>
        <h1 id="login-title">Welcome back</h1>
        <p>Sign in to manage your publication.</p>
      </div>
      <form class="auth-form" @submit.prevent="submitLogin">
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <label for="username">Username or email address</label>
        <input id="username" v-model="username" autocomplete="username" name="username" required autofocus />
        <label for="password">Password</label>
        <input id="password" v-model="password" autocomplete="current-password" name="password" type="password" required />
        <div class="auth-form__options">
          <label class="auth-checkbox"><input v-model="rememberMe" type="checkbox" /> <span>Remember me</span></label>
          <RouterLink to="/lost-password">Lost your password?</RouterLink>
        </div>
        <button class="auth-submit" type="submit">Log in</button>
      </form>
      <p class="auth-note">Local preview sign-in stores a browser session only. Server-side credential checks are not configured.</p>
      <RouterLink class="auth-back" to="/">Back to site</RouterLink>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background: #f0f0f1;
}

.auth-panel {
  width: min(100%, 400px);
  padding: 0 34px 28px;
}

.auth-brand {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  margin: 0 auto 28px;
  border: 2px solid #1d2327;
  border-radius: 50%;
  color: #1d2327;
  font: 700 42px/1 Georgia, serif;
  text-decoration: none;
}

.auth-heading {
  margin-bottom: 24px;
  text-align: center;

  h1 {
    margin: 5px 0 7px;
    color: #1d2327;
    font-size: 25px;
    font-weight: 500;
  }

  p:last-child {
    color: #646970;
  }
}

.auth-eyebrow {
  color: #646970;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border: 1px solid #c3c4c7;
  background: #fff;
  box-shadow: 0 2px 6px #1d23270d;

  > label {
    margin: 0 0 6px;
    color: #2c3338;
    font-weight: 600;
  }

  > input {
    width: 100%;
    min-height: 40px;
    margin-bottom: 19px;
    padding: 7px 10px;
    border: 1px solid #8c8f94;
    border-radius: 2px;
    background: #fff;
  }
}

.auth-form__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 20px;

  a {
    font-size: 12px;
  }
}

.auth-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.auth-submit {
  min-height: 40px;
  border: 1px solid #135e96;
  border-radius: 2px;
  color: #fff;
  background: #2271b1;
  font-weight: 600;

  &:hover {
    background: #135e96;
  }
}

.auth-error {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-left: 3px solid #d63638;
  background: #fcf0f1;
  color: #8a2424;
}

.auth-note,
.auth-back {
  display: block;
  color: #646970;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.auth-note {
  margin: 16px 0;
}

.auth-back {
  text-decoration: underline;
}

@media (max-width: 420px) {
  .auth-panel {
    padding-right: 8px;
    padding-left: 8px;
  }
}
</style>