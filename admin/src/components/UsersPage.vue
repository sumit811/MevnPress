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
  <section class="users-page" aria-labelledby="users-title">
    <header class="screen-header users-heading">
      <h1 id="users-title">Users</h1>
      <button class="button button--primary-outline" type="button" @click="router.push('/users/new')">
        <UserRoundPlus :size="16" /> Add New User
      </button>
    </header>

    <nav class="role-filters" aria-label="Filter users by role">
      <button
        v-for="role in ['All', ...roles]"
        :key="role"
        type="button"
        :class="{ 'role-filters__active': selectedRole === role }"
        @click="selectedRole = role"
      >{{ role }} <span>({{ roleCounts[role] }})</span></button>
    </nav>

    <div v-if="pageError" class="page-error" role="alert">
      <span>{{ pageError }}</span>
      <button class="button" type="button" @click="loadUsers">Retry</button>
    </div>

    <div class="users-toolbar">
      <div class="bulk-actions">
        <label class="visually-hidden" for="bulk-action">Bulk action</label>
        <select id="bulk-action" v-model="bulkAction" class="role-select">
          <option value="">Bulk actions</option>
          <option value="delete">Delete</option>
        </select>
        <button class="button" type="button" :disabled="selectedUsers.length === 0 || !bulkAction" @click="applyBulkAction">Apply</button>
      </div>
      <form class="search-form" role="search" @submit.prevent>
        <label class="visually-hidden" for="user-search">Search users</label>
        <input id="user-search" v-model="search" type="search" placeholder="Search users" />
        <button class="button" type="submit" aria-label="Search users"><Search :size="16" /></button>
      </form>
      <p class="result-count">{{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'user' : 'users' }}</p>
    </div>

    <div class="users-table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th class="check-column"><input type="checkbox" aria-label="Select all visible users" :checked="allVisibleSelected" @change="toggleVisibleUsers" /></th>
            <th scope="col">Username</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col" class="posts-column">Posts</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td class="empty-state" colspan="6">Loading users...</td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td class="check-column"><input v-model="selectedUsers" type="checkbox" :value="user.id" :aria-label="`Select ${user.username}`" /></td>
            <td>
              <strong class="username">{{ user.username }}</strong>
              <div class="row-actions"><button type="button" @click="openEditDialog(user)">Edit</button><span>|</span><button class="row-actions__delete" type="button" @click="deleteUsers([user.id])">Delete</button></div>
            </td>
            <td>{{ user.name }}</td>
            <td><a :href="`mailto:${user.email}`">{{ user.email }}</a></td>
            <td>{{ user.role }}</td>
            <td class="posts-column"><a href="#posts">{{ user.posts }}</a></td>
          </tr>
          <tr v-if="!isLoading && filteredUsers.length === 0">
            <td class="empty-state" colspan="6">{{ pageError ? 'Users could not be loaded.' : 'No users found.' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th class="check-column"><input type="checkbox" aria-label="Select all visible users" :checked="allVisibleSelected" @change="toggleVisibleUsers" /></th>
            <th scope="col">Username</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col" class="posts-column">Posts</th>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- <div v-if="isDialogOpen" class="dialog-backdrop" @click.self="isDialogOpen = false">
      <section class="user-dialog" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
        <header class="dialog-header">
          <h2 id="user-dialog-title">{{ editingUserId ? 'Edit User' : 'Add New User' }}</h2>
          <button class="icon-button" type="button" aria-label="Close dialog" @click="isDialogOpen = false"><X :size="18" /></button>
        </header>
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
      </section>
    </div> -->
  </section>
</template>

<style lang="scss" scoped>
.users-page {
  min-width: 0;
}

.users-heading {
  align-items: center;
  margin-bottom: 12px;
}

.role-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0 0 14px;

  button {
    padding: 0 9px;
    border: 0;
    border-right: 1px solid #c3c4c7;
    color: var(--wp-blue);
    background: transparent;
    line-height: 1.4;
    cursor: pointer;

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      border-right: 0;
    }

    span {
      color: var(--wp-muted);
    }
  }

  .role-filters__active {
    color: #1d2327;
    font-weight: 600;
  }
}

.users-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 320px) auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.page-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 9px 12px;
  border-left: 3px solid #d63638;
  background: #fcf0f1;
  color: #8a2424;
}

.bulk-actions,
.search-form {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-select,
.search-form input,
.user-form input,
.user-form select {
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid var(--wp-border);
  border-radius: 0;
  background: white;
}

.search-form input {
  flex: 1;
  min-width: 0;
}

.search-form button {
  width: 36px;
  padding: 0;
}

.result-count {
  color: var(--wp-muted);
  text-align: right;
  white-space: nowrap;
}

.users-table-wrap {
  overflow-x: auto;
  border: 1px solid #c3c4c7;
  background: white;
}

.users-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  text-align: left;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #c3c4c7;
    vertical-align: middle;
  }

  th {
    color: #2c3338;
    font-weight: 600;
  }

  thead,
  tfoot {
    background: #f6f7f7;
  }

  tfoot th {
    border-top: 1px solid #c3c4c7;
    border-bottom: 0;
  }

  tbody tr:nth-child(even) {
    background: #f6f7f7;
  }

  tbody tr:hover {
    background: #f0f6fc;
  }

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--wp-blue);
  }
}

.check-column {
  width: 38px;
  text-align: center;
}

.posts-column {
  width: 64px;
  text-align: center !important;
}

.username {
  color: var(--wp-blue);
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  color: #8c8f94;
  font-size: 12px;

  button {
    padding: 0;
    border: 0;
    color: var(--wp-blue);
    background: transparent;
    cursor: pointer;
  }

  .row-actions__delete {
    color: #b32d2e;
  }
}

.empty-state {
  height: 72px;
  color: var(--wp-muted);
  text-align: center;
}

.dialog-backdrop {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #1d232780;
}

.user-dialog {
  width: min(100%, 480px);
  max-height: min(90vh, 680px);
  overflow-y: auto;
  border: 1px solid #8c8f94;
  background: white;
  box-shadow: 0 8px 28px #0003;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #dcdcde;

  h2 {
    font-size: 16px;
    font-weight: 600;
  }
}

.user-form {
  display: grid;
  gap: 7px;
  padding: 16px;

  > label {
    margin-top: 5px;
    font-weight: 600;
  }

  label span {
    color: var(--wp-muted);
    font-weight: 400;
  }
}

.name-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 5px;

  div {
    display: grid;
    gap: 7px;
  }

  label {
    font-weight: 600;
  }
}

.form-error {
  padding: 8px 10px;
  border-left: 3px solid #d63638;
  background: #fcf0f1;
  color: #8a2424;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid #dcdcde;
}

@media (max-width: 720px) {
  .users-toolbar {
    grid-template-columns: 1fr auto;
  }

  .search-form {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .result-count {
    grid-column: 2;
    grid-row: 2;
  }
}

@media (max-width: 480px) {
  .users-heading {
    align-items: flex-start;
  }

  .users-heading :deep(.button) {
    padding: 4px 7px;
  }

  .name-fields {
    grid-template-columns: 1fr;
  }
}
</style>