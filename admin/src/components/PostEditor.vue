<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ImagePlus, Trash2 } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const post = ref(createPost());
const categories = ref([]);
const tags = ref([]);
const media = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const mediaOpen = ref(false);
const errorMessage = ref('');
const notice = ref('');
const contentField = ref(null);
const isNewPost = computed(() => !route.params.id);

function createPost() {
  return { title: '', slug: '', content: '', category: 'Uncategorized', tags: [], featuredImage: '', type: 'post', status: 'draft' };
}

function makeSlug(value) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request failed.');
  return result;
}

async function loadOptions() {
  try {
    [categories.value, tags.value] = await Promise.all([request('/admin/categories'), request('/admin/tags')]);
  } catch (error) {
    errorMessage.value = error.message || 'Could not load post settings.';
  }
}

async function loadPost(id) {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    post.value = await request(`/admin/posts/${id}?type=post`);
    if (!Array.isArray(post.value.tags)) post.value.tags = [];
  } catch (error) {
    errorMessage.value = error.message || 'Could not load this post.';
  } finally {
    isLoading.value = false;
  }
}

watch(() => route.params.id, (id) => {
  errorMessage.value = '';
  notice.value = '';
  if (id) loadPost(id);
  else post.value = createPost();
}, { immediate: true });
onMounted(loadOptions);

function updateTitle(value) {
  const previous = post.value.slug;
  post.value.title = value;
  if (isNewPost.value && (!previous || previous === makeSlug(post.value._previousTitle || ''))) post.value.slug = makeSlug(value);
  post.value._previousTitle = value;
}

async function savePost(status = post.value.status) {
  if (isSaving.value) return;
  const payload = { ...post.value, title: post.value.title.trim(), slug: (post.value.slug || makeSlug(post.value.title)).trim(), content: post.value.content.trim(), status, type: 'post' };
  delete payload._id;
  delete payload._previousTitle;
  if (!payload.title || !payload.slug || !payload.content) {
    errorMessage.value = 'Add a title, URL slug, and post content before saving.';
    return;
  }
  isSaving.value = true;
  errorMessage.value = '';
  notice.value = '';
  try {
    const savedPost = await request(isNewPost.value ? '/admin/posts' : `/admin/posts/${route.params.id}?type=post`, {
      method: isNewPost.value ? 'POST' : 'PUT', body: JSON.stringify(payload)
    });
    post.value = savedPost;
    notice.value = status === 'publish' ? 'Post published.' : 'Post saved as a draft.';
    if (isNewPost.value) await router.replace(`/posts/${savedPost._id}/edit`);
  } catch (error) {
    errorMessage.value = error.message || 'Could not save this post.';
  } finally {
    isSaving.value = false;
  }
}

async function openMediaPicker() {
  mediaOpen.value = true;
  try {
    media.value = await request('/admin/media');
  } catch (error) {
    errorMessage.value = error.message || 'Could not load media.';
  }
}

function selectMedia(item) {
  if (item.mimeType.startsWith('image/')) {
    post.value.content += `${post.value.content ? '\n\n' : ''}<img src="${item.url}" alt="${item.originalName.replace(/["<>]/g, '')}">`;
  } else {
    post.value.content += `${post.value.content ? '\n\n' : ''}${item.url}`;
  }
  post.value.featuredImage = item.url;
  mediaOpen.value = false;
  requestAnimationFrame(() => contentField.value?.focus());
}

async function moveToTrash() {
  if (!route.params.id || !window.confirm(`Move "${post.value.title}" to Trash?`)) return;
  try {
    await request(`/admin/posts/${route.params.id}?type=post`, { method: 'DELETE' });
    await router.push('/posts');
  } catch (error) {
    errorMessage.value = error.message || 'Could not move this post to Trash.';
  }
}
</script>

<template>
  <section class="post-editor" aria-labelledby="post-editor-title">
    <header class="post-editor__topbar">
      <RouterLink class="editor-back" to="/posts" aria-label="Back to Posts"><ArrowLeft :size="17" /></RouterLink>
      <div class="post-editor__heading"><h1 id="post-editor-title">{{ isNewPost ? 'Add New Post' : (post.title || 'Edit Post') }}</h1><span>{{ post.status === 'publish' ? 'Published' : post.status === 'trash' ? 'In Trash' : 'Draft' }}</span></div>
      <div class="post-editor__actions">
        <button v-if="!isNewPost" class="icon-button" type="button" title="Move to Trash" aria-label="Move post to Trash" @click="moveToTrash"><Trash2 :size="17" /></button>
        <button class="button" type="button" :disabled="isSaving || isLoading" @click="savePost('draft')">Save Draft</button>
        <button class="button button--primary" type="button" :disabled="isSaving || isLoading" @click="savePost('publish')">{{ isSaving ? 'Saving…' : post.status === 'publish' ? 'Update' : 'Publish' }}</button>
      </div>
    </header>
    <p v-if="errorMessage" class="editor-message editor-message--error" role="alert">{{ errorMessage }}</p>
    <p v-if="notice" class="editor-message editor-message--success" role="status">{{ notice }}</p>
    <p v-if="isLoading" class="editor-loading">Loading post…</p>
    <form v-else class="post-editor__layout" @submit.prevent="savePost()">
      <main class="post-editor__content">
        <input class="post-title-field" :value="post.title" placeholder="Add title" aria-label="Post title" autofocus @input="updateTitle($event.target.value)" />
        <div class="post-slug-field"><label for="post-slug">URL</label><input id="post-slug" v-model="post.slug" placeholder="post-url" /></div>
        <div class="post-content-toolbar"><button class="button" type="button" @click="openMediaPicker"><ImagePlus :size="16" /> Add Media</button><RouterLink to="/media">Media Library</RouterLink></div>
        <label class="visually-hidden" for="post-content">Post content</label><textarea id="post-content" ref="contentField" v-model="post.content" class="post-content-field" placeholder="Start writing…"></textarea>
      </main>
      <aside class="post-editor__settings" aria-label="Post settings">
        <section><h2>Post</h2><label for="post-status">Status</label><select id="post-status" v-model="post.status"><option value="draft">Draft</option><option value="publish">Published</option></select><p v-if="post.updatedAt">Last modified<br /><strong>{{ new Date(post.updatedAt).toLocaleString() }}</strong></p></section>
        <section><h2>Categories</h2><label for="post-category">Category</label><select id="post-category" v-model="post.category"><option value="Uncategorized">Uncategorized</option><option v-for="category in categories" :key="category._id" :value="category.name">{{ category.name }}</option></select><RouterLink to="/categories">Manage categories</RouterLink></section>
        <section><h2>Tags</h2><label v-for="tag in tags" :key="tag._id" class="post-tag-option"><input v-model="post.tags" type="checkbox" :value="tag.name" /> {{ tag.name }}</label><p v-if="!tags.length">No tags yet. <RouterLink to="/tags">Add one</RouterLink></p></section>
        <section><h2>Featured image</h2><img v-if="post.featuredImage" class="featured-image" :src="post.featuredImage" alt="Featured media" /><button class="button" type="button" @click="openMediaPicker">{{ post.featuredImage ? 'Replace image' : 'Choose image' }}</button><button v-if="post.featuredImage" class="text-button" type="button" @click="post.featuredImage = ''">Remove image</button></section>
        <button class="button button--primary" type="submit" :disabled="isSaving || isLoading">{{ isSaving ? 'Saving…' : 'Save Post' }}</button>
      </aside>
    </form>
    <div v-if="mediaOpen" class="media-picker-backdrop" @click.self="mediaOpen = false">
      <section class="media-picker" role="dialog" aria-modal="true" aria-labelledby="media-picker-title"><header><h2 id="media-picker-title">Media Library</h2><button class="icon-button" type="button" aria-label="Close media library" @click="mediaOpen = false">×</button></header><div class="media-picker__grid"><button v-for="item in media" :key="item._id" type="button" :aria-label="`Insert ${item.originalName}`" @click="selectMedia(item)"><img v-if="item.mimeType.startsWith('image/')" :src="item.url" :alt="item.originalName" /><span>{{ item.originalName }}</span></button><p v-if="!media.length">No media uploaded yet. <RouterLink to="/media">Open Media</RouterLink></p></div></section>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #1d232780;
}

.editor-modal {
  width: min(680px, 100%);
  max-height: min(90vh, 850px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #c3c4c7;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 10px 35px #1d232733;
  animation: modal-in .16s ease-out;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 21px;
    border-bottom: 1px solid #dcdcde;

    h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }
  }
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 21px 0;
  overflow-y: auto;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #2c3338;
    font-weight: 600;
  }

  input,
  textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #8c8f94;
    border-radius: 2px;
    color: #1d2327;
    background: white;
    font-weight: 400;

    &:focus {
      border-color: var(--wp-blue);
      outline: 1px solid var(--wp-blue);
    }
  }

  textarea {
    min-height: 160px;
    resize: vertical;
    line-height: 1.55;
  }

  select {
    width: 100%;
    height: 36px;
    padding: 3px 27px 3px 8px;
    border: 1px solid #8c8f94;
    border-radius: 2px;
    color: #2c3338;
    background: #fff;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 180px;
    gap: 14px;
  }

  &__footer {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 2px -21px 0;
    padding: 12px 21px;
    border-top: 1px solid #dcdcde;
    color: #646970;
    background: white;

    > div {
      display: flex;
      gap: 8px;
    }
  }
}

.editor-error {
  margin: 0;
  color: #b32d2e;
}

.post-editor { min-width: 0; margin: -1px -22px 0 -18px; color: #1d2327; }
.post-editor__topbar { min-height: 56px; display: flex; align-items: center; gap: 12px; padding: 8px 18px; border-bottom: 1px solid #dcdcde; background: #fff; }
.post-editor__heading { min-width: 0; flex: 1; }
.post-editor__heading h1 { overflow: hidden; font-size: 15px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.post-editor__heading span { color: #646970; font-size: 11px; }
.post-editor__actions { display: flex; align-items: center; gap: 7px; }
.editor-back { width: 34px; height: 34px; display: grid; flex: 0 0 auto; place-items: center; border: 1px solid #dcdcde; border-radius: 2px; color: #2c3338; background: #fff; }
.post-editor__layout { min-height: calc(100vh - 120px); display: grid; grid-template-columns: minmax(0, 1fr) 280px; }
.post-editor__content { min-width: 0; padding: 65px clamp(18px, 10vw, 150px); background: #fff; }
.post-title-field { width: 100%; padding: 8px 0 14px; border: 0; color: #1d2327; background: transparent; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; line-height: 1.15; }
.post-title-field:focus,.post-content-field:focus { outline: 0; }
.post-title-field::placeholder { color: #8c8f94; }
.post-slug-field { display: flex; align-items: center; gap: 7px; margin-bottom: 22px; color: #646970; font-size: 12px; }
.post-slug-field label { font-weight: 600; }
.post-slug-field input { width: min(320px, 60%); padding: 4px 6px; border: 1px solid transparent; color: #2271b1; background: transparent; }
.post-slug-field input:focus { border-color: #8c8f94; outline: 0; }
.post-content-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.post-content-field { width: 100%; min-height: 50vh; padding: 0; border: 0; color: #1d2327; background: transparent; font-size: 16px; line-height: 1.7; resize: vertical; }
.post-editor__settings { display: flex; flex-direction: column; gap: 14px; padding: 0 16px 24px; border-left: 1px solid #dcdcde; background: #f6f7f7; }
.post-editor__settings section { display: flex; flex-direction: column; align-items: flex-start; gap: 9px; padding: 15px 0; border-bottom: 1px solid #dcdcde; }
.post-editor__settings h2 { width: 100%; padding-bottom: 9px; border-bottom: 1px solid #dcdcde; font-size: 14px; }
.post-editor__settings select { width: 100%; min-height: 32px; padding: 4px 8px; border: 1px solid #8c8f94; background: white; }
.post-editor__settings p { color: #646970; font-size: 12px; line-height: 1.5; }
.post-tag-option { display: flex; align-items: center; gap: 6px; }
.featured-image { max-width: 100%; max-height: 180px; object-fit: contain; }
.text-button { padding: 0; border: 0; color: #b32d2e; background: transparent; }
.editor-message { margin: 8px 16px; padding: 9px 12px; background: #fff; }
.editor-message--error { border-left: 4px solid #d63638; }
.editor-message--success { border-left: 4px solid #00a32a; }
.editor-loading { padding: 24px; }
.media-picker-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: #1d232780; }
.media-picker { width: min(850px, 100%); max-height: 85vh; display: flex; flex-direction: column; background: #fff; }
.media-picker > header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #dcdcde; }
.media-picker > header h2 { font-size: 16px; }
.media-picker__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; padding: 16px; overflow: auto; }
.media-picker__grid button { display: flex; flex-direction: column; align-items: stretch; gap: 6px; overflow: hidden; border: 1px solid #c3c4c7; background: #f6f7f7; text-align: left; }
.media-picker__grid img { width: 100%; height: 100px; object-fit: cover; }
.media-picker__grid span { overflow: hidden; padding: 5px; text-overflow: ellipsis; white-space: nowrap; }

@keyframes modal-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .post-editor { margin-right: -12px; margin-left: -12px; }
  .post-editor__layout { grid-template-columns: minmax(0, 1fr); }
  .post-editor__content { padding: 36px 20px; }
  .post-editor__settings { border-top: 1px solid #dcdcde; border-left: 0; }
  .post-title-field { font-size: 32px; }
  .post-editor__topbar { gap: 7px; padding-right: 10px; padding-left: 10px; }
  .post-editor__actions { gap: 4px; }
  .editor-form {
    padding-right: 16px;
    padding-left: 16px;

    &__row {
      grid-template-columns: 1fr;
    }

    &__footer {
      margin-right: -16px;
      margin-left: -16px;
      padding-right: 16px;
      padding-left: 16px;
    }
  }

  .modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .editor-modal {
    max-height: 92vh;
    border-radius: 6px 6px 0 0;
  }
}
</style>