<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronLeft, ChevronRight, Search } from '@lucide/vue';

const router = useRouter();
const posts = ref([]);
const categories = ref([]);
const counts = ref({ all: 0, publish: 0, draft: 0, trash: 0 });
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = ref(20);
const searchInput = ref('');
const searchQuery = ref('');
const selectedStatus = ref('all');
const selectedDate = ref('');
const selectedCategory = ref('');
const selectedIds = ref([]);
const bulkAction = ref('');
const loading = ref(false);
const errorMessage = ref('');
const optionsOpen = ref(false);
const columns = ref({ author: true, category: true, tags: true, comments: true, date: true });
const statuses = computed(() => [
    { key: 'all', label: 'All', count: counts.value.all },
    { key: 'publish', label: 'Published', count: counts.value.publish },
    { key: 'draft', label: 'Draft', count: counts.value.draft },
    { key: 'trash', label: 'Trash', count: counts.value.trash }
]);
const dates = computed(() => Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date) };
}));
const allSelected = computed(() => posts.value.length > 0 && posts.value.every((post) => selectedIds.value.includes(post._id)));
const columnCount = computed(() => 2 + Object.values(columns.value).filter(Boolean).length);
const firstItem = computed(() => totalItems.value ? (currentPage.value - 1) * perPage.value + 1 : 0);
const lastItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value));

async function request(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request failed.');
    return result;
}

async function loadPosts(targetPage = currentPage.value) {
    loading.value = true;
    errorMessage.value = '';
    selectedIds.value = [];
    const params = new URLSearchParams({ type: 'post', page: String(targetPage), perPage: String(perPage.value) });
    if (selectedStatus.value !== 'all') params.set('status', selectedStatus.value);
    if (selectedDate.value) params.set('date', selectedDate.value);
    if (selectedCategory.value) params.set('category', selectedCategory.value);
    if (searchQuery.value) params.set('search', searchQuery.value);
    try {
        const result = await request(`/admin/posts?${params}`);
        posts.value = result.items;
        counts.value = result.counts;
        totalItems.value = result.total;
        totalPages.value = result.totalPages;
        currentPage.value = result.page;
    } catch (error) {
        errorMessage.value = error.message || 'Could not load posts.';
    } finally {
        loading.value = false;
    }
}

async function loadCategories() {
    try {
        categories.value = await request('/admin/categories');
    } catch (error) {
        errorMessage.value = error.message || 'Could not load categories.';
    }
}

function searchPosts() {
    searchQuery.value = searchInput.value.trim();
    loadPosts(1);
}

async function applyBulkAction() {
    if (!bulkAction.value || !selectedIds.value.length) return;
    if (bulkAction.value === 'delete' && !window.confirm(`Permanently delete ${selectedIds.value.length} selected posts?`)) return;
    try {
        await request('/admin/posts/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids: selectedIds.value, type: 'post', action: bulkAction.value })
        });
        bulkAction.value = '';
        await loadPosts(currentPage.value);
    } catch (error) {
        errorMessage.value = error.message || 'Could not apply the bulk action.';
    }
}

async function setStatus(post, status) {
    try {
        await request(`/admin/posts/${post._id}?type=post`, { method: 'PATCH', body: JSON.stringify({ status }) });
        await loadPosts(currentPage.value);
    } catch (error) {
        errorMessage.value = error.message || 'Could not update the post.';
    }
}

async function deletePost(post) {
    if (!window.confirm(`Permanently delete "${post.title}"?`)) return;
    try {
        await request(`/admin/posts/${post._id}?type=post&force=true`, { method: 'DELETE' });
        await loadPosts(currentPage.value);
    } catch (error) {
        errorMessage.value = error.message || 'Could not delete the post.';
    }
}

function formatDate(value) {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—';
}

watch([selectedStatus, selectedDate, selectedCategory, perPage], () => loadPosts(1));
onMounted(() => { loadCategories(); loadPosts(1); });
</script>

<template>
    <section class="posts-screen" aria-labelledby="posts-title">
        <div class="posts-screen__tools">
            <button class="button" type="button" :aria-expanded="optionsOpen" @click="optionsOpen = !optionsOpen">Screen Options <span aria-hidden="true">⌄</span></button>
        </div>
        <section v-if="optionsOpen" class="posts-options" aria-label="Screen Options">
            <div><h2>Columns</h2><label v-for="(enabled, key) in columns" :key="key"><input v-model="columns[key]" type="checkbox" /> {{ key[0].toUpperCase() + key.slice(1) }}</label></div>
            <label>Number of items per page <input v-model.number="perPage" type="number" min="1" max="100" /></label>
        </section>
        <header class="posts-heading">
            <div><h1 id="posts-title">Posts</h1><button class="button button--primary-outline" type="button" @click="router.push('/posts/new')">Add Post</button></div>
            <nav class="posts-status" aria-label="Filter posts by status">
                <button v-for="(status, index) in statuses" :key="status.key" type="button" :class="{ 'is-active': selectedStatus === status.key }" @click="selectedStatus = status.key">{{ status.label }} ({{ status.count }})<span v-if="index < statuses.length - 1"> | </span></button>
            </nav>
        </header>
        <div v-if="errorMessage" class="posts-error" role="alert">{{ errorMessage }} <button class="button" type="button" @click="loadPosts(currentPage)">Retry</button></div>
        <div class="posts-toolbar">
            <div class="posts-toolbar__filters">
                <select v-model="bulkAction" aria-label="Bulk action"><option value="">Bulk actions</option><option value="trash">Move to Trash</option><option value="publish">Publish</option><option value="draft">Set to Draft</option><option value="delete">Delete permanently</option></select>
                <button class="button" type="button" :disabled="!bulkAction || !selectedIds.length" @click="applyBulkAction">Apply</button>
                <select v-model="selectedDate" aria-label="Filter by date"><option value="">All dates</option><option v-for="date in dates" :key="date.value" :value="date.value">{{ date.label }}</option></select>
                <select v-model="selectedCategory" aria-label="Filter by category"><option value="">All Categories</option><option v-for="category in categories" :key="category._id" :value="category.name">{{ category.name }}</option></select>
                <button class="button" type="button" @click="loadPosts(1)">Filter</button>
            </div>
            <form class="posts-search" role="search" @submit.prevent="searchPosts"><input v-model="searchInput" type="search" aria-label="Search posts" /><button class="button button--primary-outline" type="submit"><Search :size="15" /> Search Posts</button></form>
        </div>
        <div class="posts-summary"><span>{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span><div class="posts-pagination"><span>{{ firstItem }}-{{ lastItem }} of {{ totalItems }}</span><button class="icon-button" aria-label="Previous page" :disabled="currentPage <= 1 || loading" @click="loadPosts(currentPage - 1)"><ChevronLeft :size="16" /></button><span>{{ currentPage }} of {{ totalPages }}</span><button class="icon-button" aria-label="Next page" :disabled="currentPage >= totalPages || loading" @click="loadPosts(currentPage + 1)"><ChevronRight :size="16" /></button></div></div>
        <div class="posts-table-wrap"><table class="posts-table">
            <thead><tr><th><input type="checkbox" aria-label="Select all posts" :checked="allSelected" @change="selectedIds = $event.target.checked ? posts.map((post) => post._id) : []" /></th><th>Title</th><th v-if="columns.author">Author</th><th v-if="columns.category">Categories</th><th v-if="columns.tags">Tags</th><th v-if="columns.comments">Comments</th><th v-if="columns.date">Date</th></tr></thead>
            <tbody>
                <tr v-if="loading"><td :colspan="columnCount" class="posts-empty">Loading posts...</td></tr>
                <tr v-for="post in posts" :key="post._id"><td><input v-model="selectedIds" type="checkbox" :value="post._id" :aria-label="`Select ${post.title}`" /></td>
                    <td><RouterLink class="posts-title-link" :to="`/posts/${post._id}/edit`">{{ post.title || '(no title)' }}</RouterLink><span v-if="post.status !== 'publish'"> — {{ post.status === 'trash' ? 'Trash' : 'Draft' }}</span><div class="posts-row-actions"><RouterLink :to="`/posts/${post._id}/edit`">Edit</RouterLink><template v-if="post.status === 'trash'"><button @click="setStatus(post, 'draft')">Restore</button><button class="is-danger" @click="deletePost(post)">Delete permanently</button></template><template v-else><button @click="setStatus(post, 'trash')">Trash</button></template></div></td>
                    <td v-if="columns.author">admin</td><td v-if="columns.category">{{ post.category || 'Uncategorized' }}</td><td v-if="columns.tags">{{ (post.tags || []).join(', ') || '—' }}</td><td v-if="columns.comments">{{ post.commentsCount || 0 }}</td><td v-if="columns.date"><span>{{ post.status === 'publish' ? 'Published' : 'Last Modified' }}</span><br />{{ formatDate(post.updatedAt || post.createdAt) }}</td>
                </tr>
                <tr v-if="!loading && !posts.length"><td :colspan="columnCount" class="posts-empty">No posts found.</td></tr>
            </tbody>
        </table></div>
    </section>
</template>

<style lang="scss" scoped>
.posts-screen { min-width: 0; color: #1d2327; }
.posts-screen__tools { display: flex; justify-content: flex-end; min-height: 34px; }
.posts-heading { margin: 8px 0 17px; }
.posts-heading > div { display: flex; align-items: center; gap: 12px; }
.posts-heading h1 { margin: 0; font-size: 23px; font-weight: 400; }
.posts-status { display: flex; gap: 5px; margin-top: 12px; }
.posts-status button { padding: 0; border: 0; color: #2271b1; background: transparent; }
.posts-status .is-active { color: #1d2327; }
.posts-status span { margin-left: 5px; color: #8c8f94; }
.posts-options { display: flex; align-items: flex-start; gap: 36px; padding: 15px; border: 1px solid #c3c4c7; background: #fff; }
.posts-options > div { display: flex; flex-wrap: wrap; gap: 15px; }
.posts-options h2 { width: 100%; font-size: 13px; }
.posts-options label { display: flex; align-items: center; gap: 5px; }
.posts-options input[type=number] { width: 64px; padding: 5px; }
.posts-toolbar,.posts-toolbar__filters,.posts-search,.posts-summary,.posts-pagination { display: flex; align-items: center; }
.posts-toolbar { justify-content: space-between; gap: 12px; margin: 12px 0 8px; }
.posts-toolbar__filters,.posts-search { gap: 7px; }
.posts-toolbar select,.posts-search input { min-height: 30px; padding: 4px 8px; border: 1px solid #8c8f94; background: white; }
.posts-search input { width: 160px; }
.posts-summary { justify-content: space-between; color: #646970; margin-bottom: 5px; }
.posts-pagination { gap: 7px; }
.posts-table-wrap { overflow-x: auto; border: 1px solid #c3c4c7; background: white; }
.posts-table { width: 100%; border-collapse: collapse; text-align: left; }
.posts-table th,.posts-table td { min-width: 70px; padding: 9px 10px; border-bottom: 1px solid #dcdcde; vertical-align: top; }
.posts-table th { font-weight: 500; }
.posts-table th:first-child,.posts-table td:first-child { width: 34px; min-width: 34px; }
.posts-table tbody tr:nth-child(odd) { background: #f6f7f7; }
.posts-title-link { font-weight: 600; }
.posts-row-actions { display: flex; gap: 8px; margin-top: 5px; font-size: 12px; }
.posts-row-actions button { padding: 0; border: 0; color: #2271b1; background: transparent; }
.posts-row-actions .is-danger { color: #b32d2e; }
.posts-empty { height: 54px; text-align: center; color: #646970; }
.posts-error { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 9px 12px; border-left: 4px solid #d63638; background: #fff; }
@media (max-width: 850px) { .posts-toolbar { align-items: flex-start; flex-direction: column; } .posts-toolbar__filters { flex-wrap: wrap; } }
@media (max-width: 560px) { .posts-options { flex-direction: column; gap: 18px; } .posts-search { width: 100%; } .posts-search input { flex: 1; min-width: 0; } }
</style>