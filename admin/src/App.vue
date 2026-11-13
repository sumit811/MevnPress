<script setup>
    import AdminFooter from './components/AdminFooter.vue';
    import AdminHeader from './components/AdminHeader.vue';
    import AdminSidebar from './components/AdminSidebar.vue';
</script>
<template>
  <div class="admin-shell">
    <AdminHeader @toggle-navigation="isSidebarOpen = !isSidebarOpen" />
    <AdminSidebar :is-open="isSidebarOpen" @open-editor="openEditor" />
    <main id="posts" class="main-content">
        <p>
            With strong hearts full, our souls ignite,<br />
            When all seems lost in the War of Light,<br />
            Look to the stars—<br />
            For hope burns bright!
        </p>
        <router-view ></router-view>
        <AdminFooter />
    </main>
  </div>
</template>
<style lang="scss" scoped>

</style>
