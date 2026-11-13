<script setup>
import { onMounted, ref } from 'vue';

const tags = ref([]);
const form = ref({ name: '', slug: '', description: '' });
const editingId = ref('');
const errorMessage = ref('');
const notice = ref('');

async function request(path, options = {}) {
  const response = await fetch(`/api/admin/tags${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The tag request failed.');
  return result;
}

async function loadTags() {
  try {
    tags.value = await request('');
  } catch (error) {
    errorMessage.value = error.message || 'Could not load tags.';
  }
}

function makeSlug(value) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function editTag(tag) {
  editingId.value = tag._id;
  form.value = { name: tag.name, slug: tag.slug || '', description: tag.description || '' };
  notice.value = '';
}

function resetForm() {
  editingId.value = '';
  form.value = { name: '', slug: '', description: '' };
}

async function saveTag() {
  errorMessage.value = '';
  notice.value = '';
  const payload = { ...form.value, slug: form.value.slug || makeSlug(form.value.name) };
  try {
    await request(editingId.value ? `/${editingId.value}` : '', { method: editingId.value ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    notice.value = editingId.value ? 'Tag updated.' : 'Tag added.';
    resetForm();
    await loadTags();
  } catch (error) {
    errorMessage.value = error.message || 'Could not save this tag.';
  }
}

async function deleteTag(tag) {
  if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
  try {
    await request(`/${tag._id}`, { method: 'DELETE' });
    await loadTags();
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete this tag.';
  }
}

onMounted(loadTags);
</script>

<template>
  <section class="taxonomy-screen" aria-labelledby="tags-title">
    <header class="taxonomy-heading"><h1 id="tags-title">Tags</h1></header>
    <p v-if="errorMessage" class="taxonomy-message taxonomy-message--error" role="alert">{{ errorMessage }}</p>
    <p v-if="notice" class="taxonomy-message" role="status">{{ notice }}</p>
    <div class="taxonomy-layout">
      <form class="taxonomy-form" @submit.prevent="saveTag">
        <h2>{{ editingId ? 'Edit Tag' : 'Add Tag' }}</h2>
        <label for="tag-name">Name</label><input id="tag-name" v-model.trim="form.name" required maxlength="80" />
        <p class="taxonomy-help">The name is how it appears on your site.</p>
        <label for="tag-slug">Slug</label><input id="tag-slug" v-model.trim="form.slug" placeholder="Generated from the name" />
        <p class="taxonomy-help">The URL-friendly version of the name.</p>
        <label for="tag-description">Description</label><textarea id="tag-description" v-model.trim="form.description" rows="4"></textarea>
        <p class="taxonomy-help">Descriptions may be shown by some themes.</p>
        <div class="taxonomy-form__actions"><button class="button button--primary" type="submit">{{ editingId ? 'Update Tag' : 'Add Tag' }}</button><button v-if="editingId" class="button" type="button" @click="resetForm">Cancel</button></div>
      </form>
      <div class="taxonomy-table-wrap"><table class="taxonomy-table"><thead><tr><th>Name</th><th>Description</th><th>Slug</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="tag in tags" :key="tag._id"><td><strong>{{ tag.name }}</strong></td><td>{{ tag.description || '—' }}</td><td>{{ tag.slug }}</td><td><button @click="editTag(tag)">Edit</button><button class="is-danger" @click="deleteTag(tag)">Delete</button></td></tr>
        <tr v-if="!tags.length"><td colspan="4" class="taxonomy-empty">No tags yet.</td></tr>
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
.taxonomy-form input,.taxonomy-form textarea { width: 100%; min-height: 34px; margin-bottom: 5px; padding: 6px 8px; border: 1px solid #8c8f94; background: #fff; }
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