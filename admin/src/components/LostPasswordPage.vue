<script setup>
import { ref } from 'vue';

const email = ref('');
const submitted = ref(false);

function requestReset() {
  submitted.value = true;
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="reset-title">
      <RouterLink class="auth-brand" to="/login" aria-label="Back to login">M</RouterLink>
      <div class="auth-heading">
        <p class="auth-eyebrow">ACCOUNT ACCESS</p>
        <h1 id="reset-title">Reset your password</h1>
        <p>Enter the email address associated with your account.</p>
      </div>
      <form v-if="!submitted" class="auth-form" @submit.prevent="requestReset">
        <label for="reset-email">Email address</label>
        <input id="reset-email" v-model="email" autocomplete="email" name="email" type="email" required />
        <button class="auth-submit" type="submit">Send reset link</button>
      </form>
      <div v-else class="auth-result" role="status">
        <h2>Request received</h2>
        <p>Password reset email delivery is not configured in this local preview.</p>
      </div>
      <RouterLink class="auth-back" to="/login">Back to login</RouterLink>
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
    line-height: 1.5;
  }
}

.auth-eyebrow {
  color: #646970;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.auth-form,
.auth-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  border: 1px solid #c3c4c7;
  background: #fff;
}

.auth-form label {
  color: #2c3338;
  font-weight: 600;
}

.auth-form input {
  width: 100%;
  min-height: 40px;
  margin-bottom: 10px;
  padding: 7px 10px;
  border: 1px solid #8c8f94;
  border-radius: 2px;
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

.auth-result {
  color: #2c3338;
  line-height: 1.5;

  h2 {
    font-size: 15px;
  }

  p {
    color: #646970;
  }
}

.auth-back {
  display: block;
  margin-top: 20px;
  color: #646970;
  font-size: 12px;
  text-align: center;
  text-decoration: underline;
}

@media (max-width: 420px) {
  .auth-panel {
    padding-right: 8px;
    padding-left: 8px;
  }
}
</style>