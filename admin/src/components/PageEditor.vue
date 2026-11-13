<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ExternalLink, Trash2 } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const siteOrigin = window.location.origin;
const page = ref(createPage());
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const notice = ref('');
const slugManuallyEdited = ref(false);
const isNewPage = computed(() => !route.params.id);

function createPage() {
  return { title: '', slug: '', content: '', type: 'page', status: 'draft' };
}

function makeSlug(value) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function updateTitle(value) {
  page.value.title = value;
  if (isNewPage.value && !slugManuallyEdited.value) page.value.slug = makeSlug(value);
}

async function request(path, options = {}) {
  const response = await fetch(`/api/admin/posts${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The page request failed.');
  return result;
}

async function loadPage(id) {
  isLoading.value = true;
  errorMessage.value = '';
  notice.value = '';
  try {
    page.value = await request(`/${id}?type=page`);
    slugManuallyEdited.value = true;
  } catch (error) {
    errorMessage.value = error.message || 'Could not load this page.';
  } finally {
    isLoading.value = false;
  }
}

watch(() => route.params.id, (id) => {
  if (id) {
    loadPage(id);
  } else {
    page.value = createPage();
    slugManuallyEdited.value = false;
    errorMessage.value = '';
    notice.value = '';
  }
}, { immediate: true });

async function savePage(status = page.value.status) {
  if (isSaving.value) return;
  const title = page.value.title.trim();
  const slug = (page.value.slug || makeSlug(title)).trim();
  if (!title || !slug || !page.value.content.trim()) {
    errorMessage.value = 'Add a title, URL slug, and page content before saving.';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';
  notice.value = '';
  const pageId = route.params.id;
  try {
    const savedPage = await request(pageId ? `/${pageId}?type=page` : '', {
      method: pageId ? 'PUT' : 'POST',
      body: JSON.stringify({
        title,
        slug,
        content: page.value.content,
        type: 'page',
        status
      })
    });
    page.value = savedPage;
    notice.value = status === 'publish' ? 'Page published.' : 'Page saved.';
    if (!pageId) await router.replace(`/pages/${savedPage._id}/edit`);
  } catch (error) {
    errorMessage.value = error.message || 'Could not save this page.';
  } finally {
    isSaving.value = false;
  }
}

async function moveToTrash() {
  if (!route.params.id || !window.confirm(`Move "${page.value.title}" to Trash?`)) return;
  try {
    await request(`/${route.params.id}?type=page`, { method: 'DELETE' });
    await router.push('/pages');
  } catch (error) {
    errorMessage.value = error.message || 'Could not move this page to Trash.';
  }
}

function formatDate(value) {
  if (!value) return 'Not published';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not published' : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
</script>

<template>
  <section class="page-editor" aria-labelledby="page-editor-title">
    <header class="editor-topbar">
      <RouterLink class="editor-back" to="/pages" aria-label="Back to Pages"><ArrowLeft :size="17" /></RouterLink>
      <div class="editor-topbar__name">
        <h1 id="page-editor-title">{{ isNewPage ? 'Add New Page' : (page.title || 'Edit Page') }}</h1>
        <span>{{ isNewPage ? 'Draft' : (page.status === 'publish' ? 'Published' : page.status === 'trash' ? 'In Trash' : 'Draft') }}</span>
      </div>
      <div class="editor-topbar__actions">
        <button v-if="!isNewPage && page.status !== 'trash'" class="icon-button" type="button" aria-label="Move page to Trash" title="Move to Trash" @click="moveToTrash"><Trash2 :size="17" /></button>
        <button v-if="!isNewPage && page.status === 'publish'" class="icon-button" type="button" aria-label="View page" title="View page"><ExternalLink :size="17" /></button>
        <button class="button" type="button" :disabled="isSaving || isLoading" @click="savePage('draft')">Save Draft</button>
        <button class="button button--primary" type="button" :disabled="isSaving || isLoading" @click="savePage('publish')">{{ isSaving ? 'Saving…' : page.status === 'publish' ? 'Update' : 'Publish' }}</button>
      </div>
    </header>

    <div v-if="errorMessage" class="editor-message editor-message--error" role="alert">{{ errorMessage }}</div>
    <div v-if="notice" class="editor-message editor-message--success" role="status">{{ notice }}</div>
    <div v-if="isLoading" class="editor-loading">Loading page…</div>

    <form v-else class="editor-layout" @submit.prevent="savePage()">
      <main class="editor-content">
        <input class="title-field" :value="page.title" type="text" placeholder="Add title" aria-label="Page title" autofocus @input="updateTitle($event.target.value)" />
        <div class="slug-field">
          <label for="page-slug">URL</label>
          <span>{{ siteOrigin }}/</span>
          <input id="page-slug" v-model="page.slug" type="text" placeholder="page-url" @input="slugManuallyEdited = true" />
        </div>
        <label class="visually-hidden" for="page-content">Page content</label>
        <textarea id="page-content" v-model="page.content" class="content-field" placeholder="Start writing…"></textarea>
      </main>

      <aside class="editor-settings" aria-label="Page settings">
        <section class="settings-section">
          <h2>Page</h2>
          <label for="page-status">Status</label>
          <select id="page-status" v-model="page.status">
            <option value="draft">Draft</option>
            <option value="publish">Published</option>
          </select>
          <p v-if="page.updatedAt">Last modified<br /><strong>{{ formatDate(page.updatedAt) }}</strong></p>
        </section>
        <section class="settings-section">
          <h2>Page attributes</h2>
          <label for="page-parent">Parent</label>
          <select id="page-parent" disabled><option>No parent</option></select>
          <p>Pages use the shared content schema. Parent-page hierarchy is not configured yet.</p>
        </section>
        <button class="button button--primary" type="submit" :disabled="isSaving || isLoading">{{ isSaving ? 'Saving…' : 'Save Page' }}</button>
      </aside>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.page-editor {
  min-width: 0;
  margin: -1px -22px 0 -18px;
  color: #1d2327;
}

.editor-topbar {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  border-bottom: 1px solid #dcdcde;
  background: #fff;

  &__name {
    min-width: 0;
    flex: 1;

    h1 {
      overflow: hidden;
      font-size: 15px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: #646970;
      font-size: 11px;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }
}

.editor-back {
  width: 34px;
  height: 34px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dcdcde;
  border-radius: 2px;
  color: #2c3338;
  background: #fff;
}

.editor-layout {
  min-height: calc(100vh - 120px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
}

.editor-content {
  min-width: 0;
  padding: clamp(24px, 6vw, 78px) clamp(18px, 10vw, 150px);
  background: #fff;
}

.title-field {
  width: 100%;
  padding: 8px 0 14px;
  border: 0;
  color: #1d2327;
  background: transparent;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 38px;
  line-height: 1.15;

  &::placeholder {
    color: #8c8f94;
  }

  &:focus {
    outline: 0;
  }
}

.slug-field {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 28px;
  color: #646970;
  font-size: 12px;

  label {
    font-weight: 600;
  }

  input {
    width: min(320px, 55%);
    padding: 4px 6px;
    border: 1px solid transparent;
    color: #2271b1;
    background: transparent;

    &:focus {
      border-color: #8c8f94;
      outline: 0;
    }
  }
}

.content-field {
  width: 100%;
  min-height: 48vh;
  padding: 0;
  border: 0;
  color: #1d2327;
  background: transparent;
  font-size: 16px;
  line-height: 1.7;
  resize: vertical;

  &:focus {
    outline: 0;
  }
}

.editor-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px 24px;
  border-left: 1px solid #dcdcde;
  background: #fff;

  > .button {
    align-self: flex-start;
  }
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px 0;
  border-bottom: 1px solid #dcdcde;

  h2 {
    margin-bottom: 3px;
    font-size: 13px;
    font-weight: 600;
  }

  label {
    color: #50575e;
    font-weight: 600;
  }

  select {
    min-height: 32px;
    padding: 4px 7px;
    border: 1px solid #8c8f94;
    border-radius: 2px;
    background: #fff;
  }

  p {
    color: #646970;
    font-size: 12px;
    line-height: 1.5;
  }
}

.editor-message {
  margin: 12px 18px 0;
  padding: 10px 12px;
  border-left: 4px solid;
  background: white;

  &--error {
    border-color: #d63638;
  }

  &--success {
    border-color: #00a32a;
  }
}

.editor-loading {
  padding: 30px;
  color: #646970;
}

@media (max-width: 800px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-settings {
    border-top: 1px solid #dcdcde;
    border-left: 0;
  }

  .editor-content {
    padding: 34px 22px;
  }
}

@media (max-width: 640px) {
  .page-editor {
    margin-right: -12px;
    margin-left: -12px;
  }

  .editor-topbar {
    flex-wrap: wrap;
    padding: 8px 10px;

    &__actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .title-field {
    font-size: 30px;
  }
}
</style>