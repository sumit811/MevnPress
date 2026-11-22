<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '../stores/notifications';

const router = useRouter();
const notifications = useNotificationStore();
const roles = ['Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber'];
const formError = ref('');
const form = reactive({ username: '', email: '', firstName: '', lastName: '', role: 'Subscriber' });

async function saveUser() {
  const userData = {
    username: form.username.trim(),
    email: form.email.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    role: form.role
  };

  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save this user.');

    Object.assign(form, { username: '', email: '', firstName: '', lastName: '', role: 'Subscriber' });
    formError.value = '';
    notifications.success('New user created successfully.');
  } catch (error) {
    formError.value = error.message || 'Could not save this user.';
    notifications.error(formError.value);
  }
}

function cancelAddUser() {
  Object.assign(form, { username: '', email: '', firstName: '', lastName: '', role: 'Subscriber' });
  formError.value = '';
  setTimeout(( )=> {
    router.push('/users');
  },2000);
}
</script>
<template>
    <div>
        <h1>Add User</h1>
        <p>Create a brand new user and add them to this site.</p>
        <form class="user-form" @submit.prevent="saveUser">
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <label for="user-username">Username <span>(required)</span></label>
          <input id="user-username" v-model="form.username" autocomplete="username" required />
          <label for="user-email">Email <span>(required)</span></label>
          <input id="user-email" v-model="form.email" type="email" autocomplete="email" required />
          <div class="name-fields">
            <div><label for="user-first-name">First name</label><input id="user-first-name" v-model="form.firstName" autocomplete="given-name" /></div>
            <div><label for="user-last-name">Last name</label><input id="user-last-name" v-model="form.lastName" autocomplete="family-name" /></div>
          </div>
          <label for="user-role">Role</label>
          <select id="user-role" v-model="form.role">
            <option v-for="role in roles" :key="role">{{ role }}</option>
          </select>
          <footer class="dialog-actions">
            <button class="button" type="button" @click="cancelAddUser">Cancel</button>
            <button class="button button--primary" type="submit">Add New User</button>
          </footer>
        </form>
    </div>
</template>

<style scoped lang="scss">
div > h1 {
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.3;
}

div > h1 + p {
  margin-bottom: 22px;
  color: #50575e;
  line-height: 1.5;
}

.user-form {
  display: grid;
  grid-template-columns: 166px minmax(0, 290px);
  align-items: center;
  gap: 24px 16px;
  width: min(100%, 650px);

  > label,
  .name-fields label {
    color: #2c3338;
    font-weight: 600;
    line-height: 1.4;
  }

  > input,
  .name-fields input,
  > select {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 6px 8px;
    border: 1px solid #8c8f94;
    border-radius: 0;
    background: #fff;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, .08);

    &:focus {
      border-color: #2271b1;
      box-shadow: 0 0 0 1px #2271b1;
      outline: 2px solid transparent;
    }
  }

  > select {
    width: 154px;
    padding-right: 24px;
  }

  .form-error {
    grid-column: 1 / -1;
    color: #b32d2e;
  }

  .name-fields {
    display: grid;
    grid-column: 1 / -1;
    gap: 24px;

    > div {
      display: grid;
      grid-template-columns: 166px minmax(0, 290px);
      align-items: center;
      gap: 16px;
    }
  }

  .dialog-actions {
    display: flex;
    grid-column: 2;
    gap: 8px;

    .button {
      min-height: 34px;
      padding: 6px 12px;
      border-radius: 2px;
    }

    .button--primary {
      border-color: #3858e9;
      background: #3858e9;
      box-shadow: 0 1px 0 #2c47c7;

      &:hover:not(:disabled) {
        border-color: #2c47c7;
        background: #2c47c7;
      }
    }
  }
}

@media (max-width: 640px) {
  .user-form {
    grid-template-columns: 110px minmax(0, 1fr);
    column-gap: 12px;

    .name-fields > div {
      grid-template-columns: 110px minmax(0, 1fr);
      column-gap: 12px;
    }
  }
}
</style>