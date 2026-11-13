<script setup>
import { useRoute } from 'vue-router';
import {
    FileText,
    Image,
    LayoutDashboard,
    MessageSquare,
    Palette,
    Settings,
    Users,
    Wrench
} from '@lucide/vue';

const route = useRoute();

defineEmits(['open-editor']);
</script>

<template>
    <nav aria-label="Main navigation">
        <!-- <a class="sidebar-link" href="#"><LayoutDashboard :size="17" /><span>Dashboard</span></a> -->
        <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path === '/' }" to="/">
            <FileText :size="17" /><span>Dashboard</span>
        </RouterLink>
        <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path.startsWith('/posts') }"
            to="/posts">
            <FileText :size="17" /><span>Posts</span>
        </RouterLink>
        <div class="sidebar-subnav">
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/posts' }" to="/posts">All Posts
            </RouterLink>
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/posts/new' }" to="/posts/new">Add New
            </RouterLink>
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/categories' }" to="/categories">Categories
            </RouterLink>
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/tags' }" to="/tags">Tags</RouterLink>
        </div>
        <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path.startsWith('/media') }"
            to="/media">
            <Image :size="17" /><span>Media</span>
        </RouterLink>
        <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path.startsWith('/pages') }"
            to="/pages">
            <FileText :size="17" /><span>Pages</span>
        </RouterLink>
        <div v-if="route.path.startsWith('/pages')" class="sidebar-subnav">
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/pages' }" to="/pages">All Pages
            </RouterLink>
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/pages/new' }" to="/pages/new">Add Page
            </RouterLink>
        </div>
        <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path.startsWith('/comments') }"
            to="/comments">
            <MessageSquare :size="17" /><span>Comments</span>
        </RouterLink>
        <a class="sidebar-link" href="#appearance">
            <Palette :size="17" /><span>Appearance</span>
        </a>
        <a class="sidebar-link" href="#plugins">
            <Wrench :size="17" /><span>Plugins</span>
        </a>
        <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path.startsWith('/users') }"
            to="/users">
            <FileText :size="17" /><span>Users</span>
        </RouterLink>
        <div class="sidebar-subnav">
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/users' }" to="/users">Users
            </RouterLink>
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/users/new' }" to="/users/new">Add User
            </RouterLink>
            <RouterLink :class="{ 'sidebar-subnav__active': route.path === '/users/profile' }" to="/users/profile">Profile
            </RouterLink>
        </div>
        <!-- <RouterLink class="sidebar-link" :class="{ 'sidebar-link--active': route.path === '/users' }" to="/users">
            <Users :size="17" /><span>Users</span>
        </RouterLink> -->
        <a class="sidebar-link" href="#tools">
            <Wrench :size="17" /><span>Tools</span>
        </a>
        <a class="sidebar-link" href="#settings">
            <Settings :size="17" /><span>Settings</span>
        </a>
    </nav>
</template>

<style lang="scss" scoped>
nav {
    display: flex;
    flex-direction: column;
}

.sidebar-link {
    position: relative;
    min-height: 36px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 10px;
    color: #f0f0f1;

    &:hover {
        color: #72aee6;
        background: #2c3338;
    }

    &--active {
        color: white;
        background: #2271b1;
        font-weight: 600;

        &:hover {
            color: white;
            background: #135e96;
        }
    }
}

.sidebar-subnav {
    display: flex;
    flex-direction: column;
    padding: 7px 0 10px 35px;
    background: #1d2327;

    a,
    button {
        width: fit-content;
        padding: 5px 0;
        border: 0;
        color: #c3c4c7;
        background: transparent;
        text-align: left;
    }

    a:hover,
    button:hover,
    &__active {
        color: #72aee6 !important;
    }
}
</style>