<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, Search, Trash2 } from '@lucide/vue';

const comments = ref([]);
const posts = ref([]);
const counts = ref({ all: 0, pending: 0, approved: 0, spam: 0 });
const activeStatus = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = ref(20);
const selectedIds = ref([]);
const bulkAction = ref('');
const searchInput = ref('');
const searchQuery = ref('');
const addOpen = ref(false);
const form = ref({ post: '', authorName: '', authorEmail: '', content: '' });
const errorMessage = ref('');
const notice = ref('');
const loading = ref(false);

const tabs = computed(() => [
  { key: 'all', label: 'All', count: counts.value.all },
  { key: 'pending', label: 'Pending', count: counts.value.pending },
  { key: 'approved', label: 'Approved', count: counts.value.approved },
  { key: 'spam', label: 'Spam', count: counts.value.spam }
]);
const visibleComments = computed(() => comments.value.filter((comment) => {
  const query = searchQuery.value.toLowerCase();
  return !query || [comment.authorName, comment.authorEmail, comment.content, comment.post?.title].some((value) => (value || '').toLowerCase().includes(query));
}));
const allSelected = computed(() => visibleComments.value.length > 0 && visibleComments.value.every((comment) => selectedIds.value.includes(comment._id)));

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request failed.');
  return result;
}

async function loadComments(page = currentPage.value) {
  loading.value = true;
  errorMessage.value = '';
  selectedIds.value = [];
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage.value), status: activeStatus.value });
  try {
    const result = await request(`/admin/comments?${params}`);
    comments.value = result.items;
    counts.value = result.counts;
    totalItems.value = result.total;
    totalPages.value = result.totalPages;
    currentPage.value = result.page;
  } catch (error) {
    errorMessage.value = error.message || 'Could not load comments.';
  } finally {
    loading.value = false;
  }
}

async function loadPosts() {
  try {
    const result = await request('/admin/posts?type=post&perPage=100');
    posts.value = result.items.filter((post) => post.status !== 'trash');
  } catch (error) {
    errorMessage.value = error.message || 'Could not load posts for the comment form.';
  }
}

async function addComment() {
  errorMessage.value = '';
  notice.value = '';
  try {
    await request('/admin/comments', { method: 'POST', body: JSON.stringify(form.value) });
    form.value = { post: '', authorName: '', authorEmail: '', content: '' };
    addOpen.value = false;
    notice.value = 'Comment added and approved.';
    activeStatus.value = 'approved';
    await loadComments(1);
  } catch (error) {
    errorMessage.value = error.message || 'Could not add comment.';
  }
}

async function updateStatus(comment, status) {
  try {
    await request(`/admin/comments/${comment._id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadComments(currentPage.value);
  } catch (error) {
    errorMessage.value = error.message || 'Could not update comment status.';
  }
}

async function deleteComment(comment) {
  if (!window.confirm('Delete this comment permanently?')) return;
  try {
    await request(`/admin/comments/${comment._id}`, { method: 'DELETE' });
    await loadComments(currentPage.value);
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete comment.';
  }
}

async function applyBulkAction() {
  if (!bulkAction.value || !selectedIds.value.length) return;
  if (bulkAction.value === 'delete' && !window.confirm(`Permanently delete ${selectedIds.value.length} selected comments?`)) return;
  try {
    await request('/admin/comments/bulk', { method: 'POST', body: JSON.stringify({ ids: selectedIds.value, action: bulkAction.value }) });
    bulkAction.value = '';
    await loadComments(currentPage.value);
  } catch (error) {
    errorMessage.value = error.message || 'Could not apply the bulk action.';
  }
}

function formatDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—';
}

watch(activeStatus, () => loadComments(1));
onMounted(() => { loadComments(1); loadPosts(); });
</script>

<template>
  <section class="comments-screen" aria-labelledby="comments-title">
    <header class="comments-heading"><h1 id="comments-title">Comments</h1><button class="button button--primary-outline" type="button" @click="addOpen = !addOpen">{{ addOpen ? 'Close' : 'Add Comment' }}</button></header>
    <form v-if="addOpen" class="comment-form" @submit.prevent="addComment">
      <h2>Add Comment</h2>
      <label for="comment-post">Post</label><select id="comment-post" v-model="form.post" required><option value="" disabled>Select a post</option><option v-for="post in posts" :key="post._id" :value="post._id">{{ post.title }}</option></select>
      <div class="comment-form__row"><label>Name<input v-model.trim="form.authorName" required maxlength="120" /></label><label>Email<input v-model.trim="form.authorEmail" type="email" maxlength="254" /></label></div>
      <label for="comment-content">Comment</label><textarea id="comment-content" v-model.trim="form.content" required rows="4" maxlength="5000"></textarea>
      <button class="button button--primary" type="submit">Add Comment</button>
    </form>
    <p v-if="errorMessage" class="comments-message comments-message--error" role="alert">{{ errorMessage }}</p>
    <p v-if="notice" class="comments-message" role="status">{{ notice }}</p>
    <nav class="comments-tabs" aria-label="Filter comments by status"><button v-for="(tab, index) in tabs" :key="tab.key" type="button" :class="{ 'is-active': activeStatus === tab.key }" @click="activeStatus = tab.key">{{ tab.label }} ({{ tab.count }})<span v-if="index < tabs.length - 1"> | </span></button></nav>
    <div class="comments-toolbar"><div class="comments-toolbar__left"><select v-model="bulkAction" aria-label="Bulk action"><option value="">Bulk actions</option><option value="approved">Approve</option><option value="pending">Mark pending</option><option value="spam">Mark spam</option><option value="delete">Delete permanently</option></select><button class="button" type="button" :disabled="!bulkAction || !selectedIds.length" @click="applyBulkAction">Apply</button></div><form class="comments-search" role="search" @submit.prevent="searchQuery = searchInput.trim()"><input v-model="searchInput" type="search" aria-label="Search comments" /><button class="button button--primary-outline" type="submit"><Search :size="15" /> Search Comments</button></form></div>
    <div class="comments-summary"><span>{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span><div><span>{{ currentPage }} of {{ totalPages }}</span><button class="icon-button" aria-label="Previous page" :disabled="currentPage <= 1 || loading" @click="loadComments(currentPage - 1)"><ChevronLeft :size="16" /></button><button class="icon-button" aria-label="Next page" :disabled="currentPage >= totalPages || loading" @click="loadComments(currentPage + 1)"><ChevronRight :size="16" /></button></div></div>
    <div class="comments-table-wrap"><table class="comments-table"><thead><tr><th><input type="checkbox" aria-label="Select all visible comments" :checked="allSelected" @change="selectedIds = $event.target.checked ? visibleComments.map((comment) => comment._id) : []" /></th><th>Author</th><th>Comment</th><th>In response to</th><th>Submitted on</th></tr></thead><tbody>
      <tr v-if="loading"><td colspan="5" class="comments-empty">Loading comments…</td></tr>
      <tr v-for="comment in visibleComments" :key="comment._id"><td><input v-model="selectedIds" type="checkbox" :value="comment._id" :aria-label="`Select comment by ${comment.authorName}`" /></td><td><strong>{{ comment.authorName }}</strong><br /><a v-if="comment.authorEmail" :href="`mailto:${comment.authorEmail}`">{{ comment.authorEmail }}</a></td><td><p>{{ comment.content }}</p><div class="comment-actions"><button v-if="comment.status !== 'approved'" @click="updateStatus(comment, 'approved')">Approve</button><button v-if="comment.status === 'approved'" @click="updateStatus(comment, 'pending')">Unapprove</button><button v-if="comment.status !== 'spam'" @click="updateStatus(comment, 'spam')">Spam</button><button class="is-danger" @click="deleteComment(comment)"><Trash2 :size="13" /> Delete</button></div></td><td><strong>{{ comment.post?.title || 'Deleted post' }}</strong><span class="comment-status">{{ comment.status }}</span></td><td>{{ formatDate(comment.createdAt) }}</td></tr>
      <tr v-if="!loading && !visibleComments.length"><td colspan="5" class="comments-empty">{{ searchQuery ? 'No matching comments.' : 'No comments found.' }}</td></tr>
    </tbody></table></div>
  </section>
</template>

<style lang="scss" scoped>
.comments-screen { min-width: 0; color: #1d2327; }
.comments-heading { min-height: 48px; display: flex; align-items: flex-start; gap: 12px; }
.comments-heading h1 { margin-right: auto; font-size: 23px; font-weight: 400; }
.comments-tabs { display: flex; gap: 5px; margin: 10px 0 16px; }
.comments-tabs button { padding: 0; border: 0; color: #2271b1; background: transparent; }
.comments-tabs .is-active { color: #1d2327; }
.comments-tabs span { margin-left: 5px; color: #8c8f94; }
.comments-toolbar,.comments-toolbar__left,.comments-search,.comments-summary,.comments-summary > div { display: flex; align-items: center; }
.comments-toolbar { justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.comments-toolbar__left,.comments-search { gap: 7px; }
.comments-toolbar select,.comments-search input { min-height: 30px; padding: 4px 8px; border: 1px solid #8c8f94; background: #fff; }
.comments-search input { width: 160px; }
.comments-summary { justify-content: space-between; margin-bottom: 5px; color: #646970; }
.comments-summary > div { gap: 5px; }
.comments-table-wrap { overflow-x: auto; border: 1px solid #c3c4c7; background: #fff; }
.comments-table { width: 100%; border-collapse: collapse; text-align: left; }
.comments-table th,.comments-table td { min-width: 95px; padding: 10px; border-bottom: 1px solid #dcdcde; vertical-align: top; }
.comments-table th { font-weight: 500; }
.comments-table th:first-child,.comments-table td:first-child { width: 34px; min-width: 34px; }
.comments-table tbody tr:nth-child(odd) { background: #f6f7f7; }
.comments-table td:nth-child(3) { min-width: 280px; }
.comments-table p { white-space: pre-wrap; }
.comment-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.comment-actions button { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; color: #2271b1; background: transparent; }
.comment-actions .is-danger { color: #b32d2e; }
.comment-status { display: block; margin-top: 5px; color: #646970; font-size: 12px; text-transform: capitalize; }
.comments-empty { height: 54px; text-align: center; color: #646970; }
.comment-form { display: flex; flex-direction: column; gap: 8px; margin: 0 0 18px; padding: 16px; border: 1px solid #c3c4c7; background: #fff; }
.comment-form h2 { margin-bottom: 4px; font-size: 16px; }
.comment-form label { display: flex; flex-direction: column; gap: 5px; font-weight: 600; }
.comment-form input,.comment-form select,.comment-form textarea { min-height: 32px; padding: 6px 8px; border: 1px solid #8c8f94; background: #fff; }
.comment-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.comment-form > button { align-self: flex-start; margin-top: 5px; }
.comments-message { margin-bottom: 10px; padding: 8px 10px; background: #fff; }
.comments-message--error { border-left: 4px solid #d63638; }
@media (max-width: 720px) { .comments-toolbar { align-items: flex-start; flex-direction: column; } .comments-search { width: 100%; } .comments-search input { flex: 1; min-width: 0; } }
@media (max-width: 520px) { .comment-form__row { grid-template-columns: 1fr; } }
</style>