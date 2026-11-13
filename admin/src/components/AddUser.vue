
<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Search, UserRoundPlus, X } from '@lucide/vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const roles = ['Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber'];
const users = ref([]);
const isLoading = ref(true);
const pageError = ref('');
const search = ref('');
const selectedRole = ref('All');
const bulkAction = ref('');
const selectedUsers = ref([]);
const isDialogOpen = ref(false);
const editingUserId = ref(null);
const formError = ref('');
const form = reactive({ username: '', email: '', firstName: '', lastName: '', role: 'Subscriber' });

function formatUser(user) {
  return {
    ...user,
    id: user._id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
    posts: 0
  };
}

async function requestUsers(path = '', options = {}) {
  const response = await fetch(`/api/admin/users${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The user request failed.');
  return result;
}

async function loadUsers() {
  isLoading.value = true;
  pageError.value = '';
  try {
    const records = await requestUsers();
    users.value = records.map(formatUser);
    selectedUsers.value = [];
  } catch (error) {
    pageError.value = error.message || 'Could not load users.';
  } finally {
    isLoading.value = false;
  }
}

const roleCounts = computed(() => ({
  All: users.value.length,
  ...Object.fromEntries(roles.map((role) => [role, users.value.filter((user) => user.role === role).length]))
}));

const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase();
  return users.value.filter((user) => {
    const matchesRole = selectedRole.value === 'All' || user.role === selectedRole.value;
    const matchesSearch = !query || [user.username, user.name, user.email].some((value) => value.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });
});

const allVisibleSelected = computed(() => filteredUsers.value.length > 0 && filteredUsers.value.every((user) => selectedUsers.value.includes(user.id)));

function toggleVisibleUsers(event) {
  const visibleIds = filteredUsers.value.map((user) => user.id);
  selectedUsers.value = event.target.checked
    ? [...new Set([...selectedUsers.value, ...visibleIds])]
    : selectedUsers.value.filter((id) => !visibleIds.includes(id));
}

function resetForm() {
  Object.assign(form, { username: '', email: '', firstName: '', lastName: '', role: 'Subscriber' });
  formError.value = '';
  editingUserId.value = null;
}

function openAddDialog() {
  resetForm();
  isDialogOpen.value = true;
}

function openEditDialog(user) {
  Object.assign(form, {
    username: user.username,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role
  });
  editingUserId.value = user.id;
  formError.value = '';
  isDialogOpen.value = true;
}

async function saveUser() {
  const username = form.username.trim();
  const email = form.email.trim();
  const duplicate = users.value.some((user) => user.username.toLowerCase() === username.toLowerCase() && user.id !== editingUserId.value);

  if (duplicate) {
    formError.value = 'That username is already in use.';
    return;
  }

  const userData = {
    username,
    email,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    role: form.role
  };

  try {
    await requestUsers(editingUserId.value ? `/${editingUserId.value}` : '', {
      method: editingUserId.value ? 'PUT' : 'POST',
      body: JSON.stringify(userData)
    });
    isDialogOpen.value = false;
    resetForm();
    await loadUsers();
  } catch (error) {
    formError.value = error.message || 'Could not save this user.';
  }
}

async function deleteUsers(ids) {
  try {
    await Promise.all(ids.map((id) => requestUsers(`/${id}`, { method: 'DELETE' })));
    await loadUsers();
  } catch (error) {
    await loadUsers();
    pageError.value = error.message || 'Could not delete the selected users.';
  }
}

function applyBulkAction() {
  if (bulkAction.value === 'delete') deleteUsers(selectedUsers.value);
  bulkAction.value = '';
}

onMounted(loadUsers);
</script>
<template>
    <div>
        <h1>Add User</h1>
        <p>Create a brand new user and add them to this site.</p>
        <!-- Add user form goes here -->
        <!-- <header class="dialog-header">
          <h2 id="user-dialog-title">{{ editingUserId ? 'Edit User' : 'Add New User' }}</h2>
          <button class="icon-button" type="button" aria-label="Close dialog" @click="isDialogOpen = false"><X :size="18" /></button>
        </header> -->
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
            <button class="button" type="button" @click="isDialogOpen = false">Cancel</button>
            <button class="button button--primary" type="submit">{{ editingUserId ? 'Save User' : 'Add New User' }}</button>
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