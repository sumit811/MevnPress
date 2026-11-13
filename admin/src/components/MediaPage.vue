<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { FileImage, FileText, Grid2X2, List, Search, Trash2, Upload, X } from '@lucide/vue';

const media = ref([]);
const selected = ref(null);
const selectedIds = ref([]);
const searchInput = ref('');
const searchQuery = ref('');
const typeFilter = ref('all');
const uploadOpen = ref(false);
const listView = ref(false);
const isDragging = ref(false);
const isUploading = ref(false);
const errorMessage = ref('');
const notice = ref('');
const fileInput = ref(null);

const visibleMedia = computed(() => media.value.filter((item) => {
  if (typeFilter.value === 'images') return item.mimeType.startsWith('image/');
  if (typeFilter.value === 'audio-video') return item.mimeType.startsWith('audio/') || item.mimeType.startsWith('video/');
  if (typeFilter.value === 'documents') return !item.mimeType.startsWith('image/') && !item.mimeType.startsWith('audio/') && !item.mimeType.startsWith('video/');
  return true;
}));

async function loadMedia() {
  errorMessage.value = '';
  try {
    const params = new URLSearchParams();
    if (searchQuery.value) params.set('search', searchQuery.value);
    const response = await fetch(`/api/admin/media?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load media.');
    media.value = result;
    if (selected.value && !result.some((item) => item._id === selected.value._id)) selected.value = null;
  } catch (error) {
    errorMessage.value = error.message || 'Could not load media.';
  }
}

async function uploadFiles(files) {
  if (!files.length) return;
  isUploading.value = true;
  errorMessage.value = '';
  notice.value = '';
  let uploaded = 0;
  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/media', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(`${file.name}: ${result.error || 'Upload failed.'}`);
      uploaded += 1;
    }
    notice.value = `${uploaded} ${uploaded === 1 ? 'file' : 'files'} uploaded.`;
    await loadMedia();
  } catch (error) {
    errorMessage.value = error.message || 'Could not upload the selected files.';
    await loadMedia();
  } finally {
    isUploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

function handleFiles(event) {
  uploadFiles(Array.from(event.target.files || []));
}

function searchMedia() {
  searchQuery.value = searchInput.value.trim();
  loadMedia();
}

async function deleteMedia(item) {
  if (!window.confirm(`Delete "${item.originalName}"? This cannot be undone.`)) return;
  try {
    const response = await fetch(`/api/admin/media/${item._id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not delete media.');
    selectedIds.value = selectedIds.value.filter((id) => id !== item._id);
    if (selected.value?._id === item._id) selected.value = null;
    await loadMedia();
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete media.';
  }
}

async function deleteSelected() {
  const items = media.value.filter((item) => selectedIds.value.includes(item._id));
  if (!items.length || !window.confirm(`Delete ${items.length} selected media items?`)) return;
  for (const item of items) await deleteMediaWithoutPrompt(item);
  selectedIds.value = [];
  await loadMedia();
}

async function deleteMediaWithoutPrompt(item) {
  const response = await fetch(`/api/admin/media/${item._id}`, { method: 'DELETE' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Could not delete ${item.originalName}.`);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function handleDrop(event) {
  isDragging.value = false;
  uploadFiles(Array.from(event.dataTransfer?.files || []));
}

watch(typeFilter, () => { selectedIds.value = []; });
onMounted(loadMedia);
</script>

<template>
  <section class="media-screen" aria-labelledby="media-title">
    <header class="media-heading"><h1 id="media-title">Media Library</h1><button class="button button--primary-outline" type="button" @click="uploadOpen = !uploadOpen"><Upload :size="15" /> Add Media File</button></header>
    <div v-if="errorMessage" class="media-message media-message--error" role="alert">{{ errorMessage }}</div>
    <div v-if="notice" class="media-message" role="status">{{ notice }}</div>
    <section v-if="uploadOpen" class="media-dropzone" :class="{ 'media-dropzone--active': isDragging }" aria-label="Upload media files" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
      <button class="icon-button media-dropzone__close" type="button" aria-label="Close upload panel" @click="uploadOpen = false"><X :size="18" /></button>
      <strong>{{ isUploading ? 'Uploading files…' : isDragging ? 'Drop files to upload' : 'Drop files to upload' }}</strong><span>or</span><button class="button button--primary-outline" type="button" :disabled="isUploading" @click="fileInput?.click()">Select Files</button>
      <small>Maximum upload file size: 48 MB. Images, video, audio, and PDF files.</small>
      <input ref="fileInput" class="visually-hidden" type="file" multiple accept="image/*,video/mp4,video/webm,audio/mpeg,audio/wav,application/pdf" @change="handleFiles" />
    </section>
    <div class="media-toolbar">
      <div class="media-toolbar__left"><button class="icon-button" type="button" :aria-pressed="listView" title="List view" @click="listView = true"><List :size="17" /></button><button class="icon-button" type="button" :aria-pressed="!listView" title="Grid view" @click="listView = false"><Grid2X2 :size="17" /></button><select v-model="typeFilter" aria-label="Filter media type"><option value="all">All media items</option><option value="images">Images</option><option value="audio-video">Audio and video</option><option value="documents">Documents</option></select><button v-if="selectedIds.length" class="button" type="button" @click="deleteSelected"><Trash2 :size="14" /> Delete selected ({{ selectedIds.length }})</button></div>
      <form class="media-search" role="search" @submit.prevent="searchMedia"><label for="media-search">Search media</label><input id="media-search" v-model="searchInput" type="search" /><button class="button button--primary-outline" type="submit"><Search :size="15" /><span class="visually-hidden">Search</span></button></form>
    </div>
    <div class="media-layout" :class="{ 'media-layout--details': selected }">
      <div class="media-grid" :class="{ 'media-grid--list': listView }" aria-label="Media items">
        <button v-for="item in visibleMedia" :key="item._id" class="media-item" :class="{ 'media-item--selected': selected?._id === item._id, 'media-item--checked': selectedIds.includes(item._id) }" type="button" @click="selected = item">
          <input v-model="selectedIds" type="checkbox" :value="item._id" :aria-label="`Select ${item.originalName}`" @click.stop />
          <img v-if="item.mimeType.startsWith('image/')" :src="item.url" :alt="item.originalName" />
          <span v-else class="media-item__file"><FileImage v-if="item.mimeType.startsWith('video/')" :size="28" /><FileText v-else :size="28" /></span>
          <span class="media-item__name">{{ item.originalName }}</span>
        </button>
        <p v-if="!visibleMedia.length" class="media-empty">No media items found.</p>
      </div>
      <aside v-if="selected" class="media-details" aria-label="Media details">
        <header><h2>Attachment Details</h2><button class="icon-button" type="button" aria-label="Close details" @click="selected = null"><X :size="17" /></button></header>
        <img v-if="selected.mimeType.startsWith('image/')" :src="selected.url" :alt="selected.originalName" />
        <div class="media-details__meta"><strong>{{ selected.originalName }}</strong><span>{{ new Date(selected.createdAt).toLocaleDateString() }}</span><span>{{ formatSize(selected.size) }}</span><span>{{ selected.mimeType }}</span><a :href="selected.url" target="_blank" rel="noreferrer">Open file</a></div>
        <button class="button media-details__delete" type="button" @click="deleteMedia(selected)"><Trash2 :size="14" /> Delete permanently</button>
      </aside>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.media-screen { min-width: 0; color: #1d2327; }
.media-heading { min-height: 48px; display: flex; align-items: flex-start; gap: 12px; }
.media-heading h1 { margin-right: 2px; font-size: 23px; font-weight: 400; }
.media-dropzone { position: relative; min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 0 0 14px; border: 2px dashed #c3c4c7; background: #f6f7f7; }
.media-dropzone--active { border-color: #2271b1; background: #eef6fc; }
.media-dropzone strong { font-size: 16px; font-weight: 500; }
.media-dropzone small { color: #646970; }
.media-dropzone__close { position: absolute; top: 5px; right: 6px; }
.media-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #dcdcde; background: #fff; }
.media-toolbar__left,.media-search { display: flex; align-items: center; gap: 8px; }
.media-toolbar select,.media-search input { min-height: 30px; padding: 4px 8px; border: 1px solid #8c8f94; background: #fff; }
.media-search input { width: min(250px, 30vw); }
.media-search label { color: #646970; }
.media-layout { display: grid; grid-template-columns: minmax(0, 1fr); margin-top: 16px; }
.media-layout--details { grid-template-columns: minmax(0, 1fr) 280px; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); align-content: start; gap: 12px; }
.media-item { position: relative; min-width: 0; height: 142px; overflow: hidden; padding: 0; border: 1px solid #dcdcde; background: #fff; text-align: left; }
.media-item--selected,.media-item--checked { outline: 2px solid #2271b1; outline-offset: -2px; }
.media-item > img { width: 100%; height: 108px; object-fit: cover; background: #f0f0f1; }
.media-item > input { position: absolute; z-index: 1; top: 6px; left: 6px; }
.media-item__file { height: 108px; display: grid; place-items: center; color: #646970; background: #f0f0f1; }
.media-item__name { display: block; overflow: hidden; padding: 6px 7px; color: #2c3338; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.media-grid--list { grid-template-columns: 1fr; gap: 0; }
.media-grid--list .media-item { height: 54px; display: flex; align-items: center; border: 0; border-bottom: 1px solid #dcdcde; }
.media-grid--list .media-item > img,.media-grid--list .media-item__file { width: 44px; height: 42px; margin-left: 32px; }
.media-grid--list .media-item__file svg { width: 20px; }
.media-grid--list .media-item__name { padding: 10px; font-size: 13px; }
.media-grid--list .media-item > input { left: 8px; }
.media-details { min-width: 0; display: flex; flex-direction: column; gap: 12px; padding: 12px; border-left: 1px solid #dcdcde; background: #fff; }
.media-details header { display: flex; align-items: center; justify-content: space-between; }
.media-details h2 { font-size: 14px; }
.media-details > img { width: 100%; max-height: 180px; object-fit: contain; background: #f0f0f1; }
.media-details__meta { display: flex; flex-direction: column; gap: 5px; color: #646970; font-size: 12px; overflow-wrap: anywhere; }
.media-details__meta strong { color: #1d2327; font-size: 13px; }
.media-details__delete { align-self: flex-start; }
.media-empty { grid-column: 1 / -1; padding: 25px; color: #646970; text-align: center; }
.media-message { margin-bottom: 10px; padding: 8px 10px; background: #fff; }
.media-message--error { border-left: 4px solid #d63638; }
@media (max-width: 760px) { .media-toolbar { align-items: flex-start; flex-direction: column; } .media-toolbar__left { flex-wrap: wrap; } .media-layout--details { grid-template-columns: minmax(0, 1fr); } .media-details { border-top: 1px solid #dcdcde; border-left: 0; } }
@media (max-width: 520px) { .media-heading { flex-wrap: wrap; } .media-search { width: 100%; } .media-search input { flex: 1; width: auto; } .media-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 7px; } }
</style>