<script setup>
import { onMounted, ref } from 'vue';

const categories = ref([]);
const form = ref({ name: '', slug: '', description: '', parentCategory: '' });
const editingId = ref('');
const errorMessage = ref('');
const notice = ref('');

async function request(path, options = {}) {
  const response = await fetch(`/api/admin/categories${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The category request failed.');
  return result;
}

async function loadCategories() {
  try {
    categories.value = await request('');
  } catch (error) {
    errorMessage.value = error.message || 'Could not load categories.';
  }
}

function makeSlug(value) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function editCategory(category) {
  editingId.value = category._id;
  form.value = { name: category.name, slug: category.slug || '', description: category.description || '', parentCategory: category.parentCategory || '' };
  notice.value = '';
}

function resetForm() {
  editingId.value = '';
  form.value = { name: '', slug: '', description: '', parentCategory: '' };
}

async function saveCategory() {
  errorMessage.value = '';
  notice.value = '';
  const payload = { ...form.value, slug: form.value.slug || makeSlug(form.value.name), parentCategory: form.value.parentCategory || null };
  try {
    await request(editingId.value ? `/${editingId.value}` : '', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    notice.value = editingId.value ? 'Category updated.' : 'Category added.';
    resetForm();
    await loadCategories();
  } catch (error) {
    errorMessage.value = error.message || 'Could not save this category.';
  }
}

async function deleteCategory(category) {
  if (!window.confirm(`Delete category "${category.name}"? Posts will keep their saved category label.`)) return;
  try {
    await request(`/${category._id}`, { method: 'DELETE' });
    await loadCategories();
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete this category.';
  }
}

onMounted(loadCategories);
</script>

<template>
  <section class="taxonomy-screen" aria-labelledby="categories-title">
    <header class="taxonomy-heading"><h1 id="categories-title">Categories</h1></header>
    <p v-if="errorMessage" class="taxonomy-message taxonomy-message--error" role="alert">{{ errorMessage }}</p>
    <p v-if="notice" class="taxonomy-message" role="status">{{ notice }}</p>
    <div class="taxonomy-layout">
      <form class="taxonomy-form" @submit.prevent="saveCategory">
        <h2>{{ editingId ? 'Edit Category' : 'Add Category' }}</h2>
        <label for="category-name">Name</label><input id="category-name" v-model.trim="form.name" required maxlength="80" />
        <p class="taxonomy-help">The name is how it appears on your site.</p>
        <label for="category-slug">Slug</label><input id="category-slug" v-model.trim="form.slug" placeholder="Generated from the name" />
        <p class="taxonomy-help">The URL-friendly version of the name.</p>
        <label for="category-parent">Parent Category</label><select id="category-parent" v-model="form.parentCategory"><option value="">None</option><option v-for="category in categories.filter((item) => item._id !== editingId)" :key="category._id" :value="category._id">{{ category.name }}</option></select>
        <label for="category-description">Description</label><textarea id="category-description" v-model.trim="form.description" rows="4"></textarea>
        <p class="taxonomy-help">Descriptions may be shown by some themes.</p>
        <div class="taxonomy-form__actions"><button class="button button--primary" type="submit">{{ editingId ? 'Update Category' : 'Add Category' }}</button><button v-if="editingId" class="button" type="button" @click="resetForm">Cancel</button></div>
      </form>
      <div class="taxonomy-table-wrap"><table class="taxonomy-table"><thead><tr><th>Name</th><th>Description</th><th>Slug</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="category in categories" :key="category._id"><td><strong>{{ category.name }}</strong></td><td>{{ category.description || '—' }}</td><td>{{ category.slug }}</td><td><button @click="editCategory(category)">Edit</button><button class="is-danger" @click="deleteCategory(category)">Delete</button></td></tr>
        <tr v-if="!categories.length"><td colspan="4" class="taxonomy-empty">No categories yet.</td></tr>
      </tbody></table></div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.taxonomy-screen { min-width: 0; color: #1d2327; }
.taxonomy-heading { min-height: 48px; }
.taxonomy-heading h1 { font-size: 23px; font-weight: 400; }
.taxonomy-layout { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr); gap: 26px; align-items: start; }
.taxonomy-form { display: flex; flex-direction: column; align-items: flex-start; }
.taxonomy-form h2 { margin: 0 0 12px; font-size: 14px; }
.taxonomy-form label { margin: 0 0 5px; font-weight: 600; }
.taxonomy-form input,.taxonomy-form select,.taxonomy-form textarea { width: 100%; min-height: 34px; margin-bottom: 5px; padding: 6px 8px; border: 1px solid #8c8f94; background: #fff; }
.taxonomy-form textarea { resize: vertical; }
.taxonomy-help { margin: 0 0 12px; color: #646970; font-size: 12px; }
.taxonomy-form__actions { display: flex; gap: 8px; margin-top: 4px; }
.taxonomy-table-wrap { overflow-x: auto; border: 1px solid #c3c4c7; background: #fff; }
.taxonomy-table { width: 100%; border-collapse: collapse; text-align: left; }
.taxonomy-table th,.taxonomy-table td { padding: 10px; border-bottom: 1px solid #dcdcde; vertical-align: top; }
.taxonomy-table th { font-weight: 500; }
.taxonomy-table tbody tr:nth-child(odd) { background: #f6f7f7; }
.taxonomy-table td:last-child { white-space: nowrap; }
.taxonomy-table button { margin-right: 10px; padding: 0; border: 0; color: #2271b1; background: transparent; }
.taxonomy-table button.is-danger { color: #b32d2e; }
.taxonomy-empty { text-align: center; color: #646970; }
.taxonomy-message { margin: 0 0 12px; padding: 8px 10px; background: #fff; }
.taxonomy-message--error { border-left: 4px solid #d63638; }
@media (max-width: 760px) { .taxonomy-layout { grid-template-columns: 1fr; } }
</style>