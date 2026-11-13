<script setup>
import { ref } from 'vue';
import AdminFooter from '../components/AdminFooter.vue';
import AdminHeader from '../components/AdminHeader.vue';
import AdminSidebar from '../components/AdminSidebar.vue';

const isSidebarOpen = ref(false);
</script>

<template>
  <div class="admin-shell">
    <AdminHeader @toggle-navigation="isSidebarOpen = !isSidebarOpen" />
    <AdminSidebar :is-open="isSidebarOpen" />

    <main class="main-content">
      <router-view></router-view>
      <AdminFooter />
    </main>
  </div>
</template>

<style lang="scss" scoped>
@media (max-width: 900px) {
  .main-content {
    padding-right: 16px;
    padding-left: 14px;
  }
}

@media (max-width: 640px) {
  .main-content {
    margin-left: 0;
    padding: 63px 12px 0;
  }
}
</style>