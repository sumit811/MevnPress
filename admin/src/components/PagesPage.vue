<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronLeft, ChevronRight, Search } from '@lucide/vue';

const router = useRouter();
const pages = ref([]);
const counts = ref({ all: 0, publish: 0, draft: 0, trash: 0 });
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const perPage = ref(readPreference('pages-per-page', 20));
const searchInput = ref('');
const searchQuery = ref('');
const selectedStatus = ref('all');
const selectedDate = ref('');
const selectedIds = ref([]);
const bulkAction = ref('');
const isLoading = ref(false);
const pageError = ref('');
const screenOptionsOpen = ref(false);
const helpOpen = ref(false);
const activeHelpTab = ref('overview');
const columns = ref(readPreference('pages-columns', { author: true, comments: true, date: true }));
const viewMode = ref(readPreference('pages-view-mode', 'extended'));

const statusTabs = computed(() => [
  { key: 'all', label: 'All', count: counts.value.all },
  { key: 'publish', label: 'Published', count: counts.value.publish },
  { key: 'draft', label: 'Draft', count: counts.value.draft },
  { key: 'trash', label: 'Trash', count: counts.value.trash }
]);

const dateOptions = computed(() => Array.from({ length: 12 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - index);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return {
    value: `${date.getFullYear()}-${month}`,
    label: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
  };
}));

const allVisibleSelected = computed(() => pages.value.length > 0 && pages.value.every((page) => selectedIds.value.includes(page._id)));
const visibleColumnCount = computed(() => 2 + Number(columns.value.author) + Number(columns.value.comments) + Number(columns.value.date));
const firstItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1);
const lastItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value));

function readPreference(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

watch([columns, perPage, viewMode], () => {
  localStorage.setItem('pages-columns', JSON.stringify(columns.value));
  localStorage.setItem('pages-per-page', JSON.stringify(perPage.value));
  localStorage.setItem('pages-view-mode', JSON.stringify(viewMode.value));
}, { deep: true });

async function request(path, options = {}) {
  const response = await fetch(`/api/admin/posts${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The page request failed.');
  return result;
}

async function loadPages(targetPage = currentPage.value) {
  isLoading.value = true;
  pageError.value = '';
  selectedIds.value = [];
  const params = new URLSearchParams({
    type: 'page',
    page: String(targetPage),
    perPage: String(perPage.value)
  });
  if (selectedStatus.value !== 'all') params.set('status', selectedStatus.value);
  if (selectedDate.value) params.set('date', selectedDate.value);
  if (searchQuery.value) params.set('search', searchQuery.value);

  try {
    const result = await request(`?${params}`);
    pages.value = result.items;
    counts.value = result.counts;
    totalItems.value = result.total;
    totalPages.value = result.totalPages;
    currentPage.value = result.page;
    if (targetPage > result.totalPages) await loadPages(result.totalPages);
  } catch (error) {
    pageError.value = error.message || 'Could not load pages.';
  } finally {
    isLoading.value = false;
  }
}

function searchPages() {
  searchQuery.value = searchInput.value.trim();
  loadPages(1);
}

function selectAllVisible(event) {
  selectedIds.value = event.target.checked ? pages.value.map((page) => page._id) : [];
}

async function trashPage(page) {
  try {
    await request(`/${page._id}?type=page`, { method: 'DELETE' });
    await loadPages(currentPage.value);
  } catch (error) {
    pageError.value = error.message || 'Could not move this page to Trash.';
  }
}

async function restorePage(page) {
  try {
    await request(`/${page._id}?type=page`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'draft' })
    });
    await loadPages(currentPage.value);
  } catch (error) {
    pageError.value = error.message || 'Could not restore this page.';
  }
}

async function permanentlyDelete(page) {
  if (!window.confirm(`Permanently delete "${page.title}"? This cannot be undone.`)) return;
  try {
    await request(`/${page._id}?type=page&force=true`, { method: 'DELETE' });
    await loadPages(currentPage.value);
  } catch (error) {
    pageError.value = error.message || 'Could not permanently delete this page.';
  }
}

async function applyBulkAction() {
  if (!bulkAction.value || selectedIds.value.length === 0) return;
  if (bulkAction.value === 'delete' && !window.confirm(`Permanently delete ${selectedIds.value.length} selected pages? This cannot be undone.`)) return;

  try {
    await request('/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds.value, type: 'page', action: bulkAction.value })
    });
    bulkAction.value = '';
    await loadPages(currentPage.value);
  } catch (error) {
    pageError.value = error.message || 'Could not apply the bulk action.';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function excerpt(content) {
  return (content || '').replace(/\s+/g, ' ').trim();
}

watch([selectedStatus, selectedDate, perPage], () => loadPages(1));
onMounted(() => loadPages(1));
</script>

<template>
  <section class="pages-screen" aria-labelledby="pages-title">
    <div class="screen-tools">
      <button class="screen-tools__button" type="button" :aria-expanded="screenOptionsOpen" @click="screenOptionsOpen = !screenOptionsOpen">Screen Options <span aria-hidden="true">⌄</span></button>
      <button class="screen-tools__button" type="button" :aria-expanded="helpOpen" @click="helpOpen = !helpOpen">Help <span aria-hidden="true">⌄</span></button>
    </div>

    <section v-if="screenOptionsOpen" class="options-panel" aria-label="Screen Options">
      <div class="options-panel__section">
        <h2>Columns</h2>
        <label><input v-model="columns.author" type="checkbox" /> Author</label>
        <label><input v-model="columns.comments" type="checkbox" /> Comments</label>
        <label><input v-model="columns.date" type="checkbox" /> Date</label>
      </div>
      <div class="options-panel__section">
        <h2>Pagination</h2>
        <label class="per-page-control" for="pages-per-page">Number of items per page:
          <input id="pages-per-page" v-model.number="perPage" type="number" min="1" max="100" />
        </label>
      </div>
      <div class="options-panel__section">
        <h2>View mode</h2>
        <label><input v-model="viewMode" type="radio" value="compact" /> Compact view</label>
        <label><input v-model="viewMode" type="radio" value="extended" /> Extended view</label>
      </div>
    </section>

    <section v-if="helpOpen" class="help-panel" aria-label="Pages Help">
      <nav class="help-panel__tabs" aria-label="Help topics">
        <button type="button" :class="{ 'is-active': activeHelpTab === 'overview' }" @click="activeHelpTab = 'overview'">Overview</button>
        <button type="button" :class="{ 'is-active': activeHelpTab === 'managing' }" @click="activeHelpTab = 'managing'">Managing Pages</button>
      </nav>
      <div class="help-panel__content">
        <p v-if="activeHelpTab === 'overview'">Pages are for content that is not part of the chronological blog stream. Pages can be edited, saved as drafts, published, or moved to Trash.</p>
        <p v-else>Use the page title and row actions to edit, view, restore, or move a page to Trash. Select multiple pages to apply a bulk action. Search and date filters narrow the current page list.</p>
        <aside><strong>For more information:</strong><a href="https://wordpress.org/documentation/article/pages/" target="_blank" rel="noreferrer">Documentation on Pages</a><a href="https://wordpress.org/support/forums/" target="_blank" rel="noreferrer">Support forums</a></aside>
      </div>
    </section>

    <header class="pages-heading">
      <div class="pages-heading__title">
        <h1 id="pages-title">Pages</h1>
        <button class="button button--primary-outline" type="button" @click="router.push('/pages/new')">Add Page</button>
      </div>
      <nav class="status-tabs" aria-label="Filter pages by status">
        <button v-for="(tab, index) in statusTabs" :key="tab.key" type="button" :class="{ 'is-active': selectedStatus === tab.key }" @click="selectedStatus = tab.key">
          <span>{{ tab.label }} <span class="status-tabs__count">({{ tab.count }})</span></span><i v-if="index < statusTabs.length - 1" aria-hidden="true">|</i>
        </button>
      </nav>
    </header>

    <div v-if="pageError" class="page-error" role="alert">
      <span>{{ pageError }}</span>
      <button class="button" type="button" @click="loadPages(currentPage)">Retry</button>
    </div>

    <div class="table-toolbar">
      <div class="table-toolbar__left">
        <label class="visually-hidden" for="pages-bulk-action">Bulk action</label>
        <select id="pages-bulk-action" v-model="bulkAction" class="toolbar-select">
          <option value="">Bulk actions</option>
          <option value="trash">Move to Trash</option>
          <option value="publish">Publish</option>
          <option value="draft">Set to Draft</option>
          <option value="delete">Delete permanently</option>
        </select>
        <button class="button" type="button" :disabled="!bulkAction || selectedIds.length === 0" @click="applyBulkAction">Apply</button>
        <label class="visually-hidden" for="pages-date-filter">Filter by date</label>
        <select id="pages-date-filter" v-model="selectedDate" class="toolbar-select date-select">
          <option value="">All dates</option>
          <option v-for="option in dateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <button class="button" type="button" @click="loadPages(1)">Filter</button>
      </div>
      <form class="search-form" role="search" @submit.prevent="searchPages">
        <label class="visually-hidden" for="pages-search">Search Pages</label>
        <input id="pages-search" v-model="searchInput" type="search" />
        <button class="button button--primary-outline" type="submit"><Search :size="15" /> Search Pages</button>
      </form>
    </div>

    <div class="table-summary">
      <span>{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span>
      <div class="pagination" aria-label="Pages pagination">
        <span>{{ firstItem }}-{{ lastItem }} of {{ totalItems }}</span>
        <button class="icon-button" type="button" aria-label="Previous page" :disabled="currentPage <= 1 || isLoading" @click="loadPages(currentPage - 1)"><ChevronLeft :size="16" /></button>
        <span class="pagination__current">{{ currentPage }} of {{ totalPages }}</span>
        <button class="icon-button" type="button" aria-label="Next page" :disabled="currentPage >= totalPages || isLoading" @click="loadPages(currentPage + 1)"><ChevronRight :size="16" /></button>
      </div>
    </div>

    <div class="pages-table-wrap" :class="`pages-table-wrap--${viewMode}`">
      <table class="pages-table">
        <thead>
          <tr>
            <th class="check-column"><input type="checkbox" aria-label="Select all pages on this page" :checked="allVisibleSelected" @change="selectAllVisible" /></th>
            <th scope="col">Title <span class="sort-mark" aria-hidden="true">↕</span></th>
            <th v-if="columns.author" scope="col">Author</th>
            <th v-if="columns.comments" scope="col" class="number-column">Comments <span class="sort-mark" aria-hidden="true">↕</span></th>
            <th v-if="columns.date" scope="col">Date <span class="sort-mark" aria-hidden="true">↕</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td class="empty-state" :colspan="visibleColumnCount">Loading pages...</td></tr>
          <tr v-for="page in pages" :key="page._id">
            <td class="check-column"><input v-model="selectedIds" type="checkbox" :value="page._id" :aria-label="`Select ${page.title || 'untitled page'}`" /></td>
            <td>
              <RouterLink class="page-title" :to="`/pages/${page._id}/edit`">{{ page.title || '(no title)' }}</RouterLink><span v-if="page.status === 'draft'" class="page-status"> — Draft</span><span v-else-if="page.status === 'trash'" class="page-status"> — Trash</span>
              <div class="row-actions">
                <RouterLink :to="`/pages/${page._id}/edit`">Edit</RouterLink>
                <template v-if="page.status === 'trash'">
                  <span>|</span><button type="button" @click="restorePage(page)">Restore</button>
                  <span>|</span><button class="row-actions__delete" type="button" @click="permanentlyDelete(page)">Delete permanently</button>
                </template>
                <template v-else>
                  <span>|</span><button class="row-actions__delete" type="button" @click="trashPage(page)">Trash</button>
                </template>
              </div>
              <p v-if="viewMode === 'extended' && excerpt(page.content)" class="page-excerpt">{{ excerpt(page.content) }}</p>
            </td>
            <td v-if="columns.author">admin</td>
            <td v-if="columns.comments" class="number-column">—</td>
            <td v-if="columns.date"><span class="date-status">{{ page.status === 'publish' ? 'Published' : 'Last Modified' }}</span><br />{{ formatDate(page.updatedAt || page.createdAt) }}</td>
          </tr>
          <tr v-if="!isLoading && pages.length === 0"><td class="empty-state" :colspan="visibleColumnCount">{{ pageError ? 'Pages could not be loaded.' : 'No pages found.' }}</td></tr>
        </tbody>
        <tfoot>
          <tr>
            <th class="check-column"><input type="checkbox" aria-label="Select all pages on this page" :checked="allVisibleSelected" @change="selectAllVisible" /></th>
            <th scope="col">Title <span class="sort-mark" aria-hidden="true">↕</span></th>
            <th v-if="columns.author" scope="col">Author</th>
            <th v-if="columns.comments" scope="col" class="number-column">Comments <span class="sort-mark" aria-hidden="true">↕</span></th>
            <th v-if="columns.date" scope="col">Date <span class="sort-mark" aria-hidden="true">↕</span></th>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="table-toolbar table-toolbar--bottom">
      <div class="table-toolbar__left">
        <label class="visually-hidden" for="pages-bulk-action-bottom">Bulk action</label>
        <select id="pages-bulk-action-bottom" v-model="bulkAction" class="toolbar-select">
          <option value="">Bulk actions</option>
          <option value="trash">Move to Trash</option>
          <option value="publish">Publish</option>
          <option value="draft">Set to Draft</option>
          <option value="delete">Delete permanently</option>
        </select>
        <button class="button" type="button" :disabled="!bulkAction || selectedIds.length === 0" @click="applyBulkAction">Apply</button>
      </div>
      <div class="pagination" aria-label="Pages pagination">
        <span>{{ firstItem }}-{{ lastItem }} of {{ totalItems }}</span>
        <button class="icon-button" type="button" aria-label="Previous page" :disabled="currentPage <= 1 || isLoading" @click="loadPages(currentPage - 1)"><ChevronLeft :size="16" /></button>
        <span class="pagination__current">{{ currentPage }} of {{ totalPages }}</span>
        <button class="icon-button" type="button" aria-label="Next page" :disabled="currentPage >= totalPages || isLoading" @click="loadPages(currentPage + 1)"><ChevronRight :size="16" /></button>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.pages-screen {
  position: relative;
  padding-top: 5px;
  color: #1d2327;
}

.screen-tools {
  position: absolute;
  top: -64px;
  right: -22px;
  display: flex;
  gap: 6px;

  &__button {
    min-height: 28px;
    padding: 3px 11px;
    border: 1px solid #c3c4c7;
    border-top: 0;
    border-radius: 0 0 3px 3px;
    color: #2c3338;
    background: #f6f7f7;
    font-weight: 500;
  }
}

.options-panel,
.help-panel {
  margin: 0 0 17px;
  border: 1px solid #c3c4c7;
  background: #fff;
}

.options-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  padding: 16px;

  &__section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    min-width: 190px;

    h2 {
      width: 100%;
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    }

    label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #3c434a;
    }
  }
}

.per-page-control input {
  width: 58px;
  height: 32px;
  padding: 4px 6px;
  border: 1px solid #8c8f94;
}

.help-panel {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  background: #f0f3fa;

  &__tabs {
    display: flex;
    flex-direction: column;
    padding: 12px 0;
    border-right: 1px solid #c3c4c7;

    button {
      padding: 7px 12px;
      border: 0;
      color: #2271b1;
      background: transparent;
      text-align: left;
    }

    .is-active {
      border-left: 3px solid #2271b1;
      color: #1d2327;
      background: #fff;
    }
  }

  &__content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 190px;
    gap: 24px;
    padding: 17px;
    line-height: 1.55;

    aside {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-left: 17px;
      border-left: 1px solid #c3c4c7;
    }
  }
}

.pages-heading {
  margin-bottom: 17px;
}

.pages-heading__title {
  display: flex;
  align-items: center;
  gap: 12px;

  h1 {
    font-size: 23px;
    font-weight: 400;
  }
}

.status-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 12px;

  button {
    display: inline-flex;
    gap: 7px;
    padding: 0;
    border: 0;
    color: #2271b1;
    background: transparent;

    i {
      color: #8c8f94;
      font-style: normal;
    }

    &.is-active {
      color: #1d2327;
      font-weight: 600;
    }
  }

  &__count {
    color: #646970;
    font-weight: 400;
  }
}

.table-toolbar,
.table-toolbar__left,
.search-form,
.table-summary,
.pagination {
  display: flex;
  align-items: center;
}

.table-toolbar {
  justify-content: space-between;
  gap: 14px;
  margin: 12px 0 8px;

  &__left {
    flex-wrap: wrap;
    gap: 7px;
  }

  &--bottom {
    margin-top: 8px;
  }
}

.toolbar-select,
.search-form input {
  height: 32px;
  padding: 4px 8px;
  border: 1px solid #8c8f94;
  border-radius: 2px;
  color: #2c3338;
  background: #fff;
}

.toolbar-select {
  min-width: 110px;
}

.date-select {
  min-width: 130px;
}

.search-form {
  gap: 7px;

  input {
    width: min(230px, 30vw);
  }
}

.table-summary {
  min-height: 28px;
  justify-content: space-between;
  color: #646970;
  font-size: 12px;
}

.pagination {
  gap: 5px;

  .icon-button {
    width: 27px;
    height: 27px;
    border: 1px solid #c3c4c7;
    border-radius: 2px;
    background: #f6f7f7;
  }

  &__current {
    min-width: 56px;
    text-align: center;
  }
}

.pages-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #c3c4c7;
  background: white;
}

.pages-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #c3c4c7;
    vertical-align: middle;
  }

  th {
    height: 34px;
    color: #2c3338;
    font-weight: 500;
    white-space: nowrap;
  }

  tbody tr:nth-child(odd) {
    background: #f6f7f7;
  }

  tbody tr:hover {
    background: #f0f6fc;
  }

  tfoot th {
    border-bottom: 0;
  }
}

.check-column {
  width: 34px;
  padding-right: 5px !important;
  padding-left: 9px !important;
}

.number-column {
  width: 90px;
  text-align: center !important;
}

.sort-mark {
  color: #8c8f94;
  font-size: 14px;
}

.page-title {
  color: #2271b1;
  font-weight: 600;
}

.page-status {
  color: #646970;
  font-weight: 600;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
  font-size: 12px;

  button {
    padding: 0;
    border: 0;
    color: #2271b1;
    background: transparent;
  }

  &__delete {
    color: #b32d2e !important;
  }
}

.page-excerpt {
  max-width: 690px;
  margin-top: 5px;
  overflow: hidden;
  color: #646970;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pages-table-wrap--compact .pages-table tbody td {
  padding-top: 5px;
  padding-bottom: 5px;
}

.date-status {
  color: #646970;
}

.empty-state {
  height: 54px;
  color: #646970;
  text-align: center;
}

.page-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 0;
  padding: 10px 12px;
  border-left: 4px solid #d63638;
  background: #fff;
}

@media (max-width: 800px) {
  .help-panel__content {
    grid-template-columns: 1fr;

    aside {
      padding: 12px 0 0;
      border-top: 1px solid #c3c4c7;
      border-left: 0;
    }
  }

  .table-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .table-toolbar__left,
  .search-form {
    width: 100%;
  }

  .search-form input {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 640px) {
  .screen-tools {
    position: static;
    justify-content: flex-end;
    margin: -4px 0 12px;

    &__button {
      border-top: 1px solid #c3c4c7;
      border-radius: 3px;
    }
  }

  .options-panel {
    gap: 18px;
  }

  .help-panel {
    grid-template-columns: 1fr;

    &__tabs {
      flex-direction: row;
      border-right: 0;
      border-bottom: 1px solid #c3c4c7;
    }
  }

  .table-toolbar__left > * {
    max-width: 100%;
  }

  .date-select {
    flex: 1;
  }

  .table-summary {
    gap: 8px;
  }

  .pagination > span:first-child {
    display: none;
  }
}
</style>