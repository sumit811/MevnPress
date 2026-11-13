import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import PostsPage from './components/PostsPage.vue';
import PostEditor from './components/PostEditor.vue';
import MediaPage from './components/MediaPage.vue';
import CommentsPage from './components/CommentsPage.vue';
import PagesPage from './components/PagesPage.vue';
import PageEditor from './components/PageEditor.vue';
import CategoriesPage from './components/CategoriesPage.vue';
import TagsPage from './components/TagsPage.vue';
import UsersPage from './components/UsersPage.vue';
import AddUser from './components/AddUser.vue';
import UserProfile from './components/UserProfile.vue';
import AdminPageView from './views/AdminPageView.vue';
import Dashboard from './components/Dashboard.vue';
import LoginPage from './components/LoginPage.vue';
import LostPasswordPage from './components/LostPasswordPage.vue';
import { useAuthStore } from './stores/auth';
import pinia from './stores/pinia';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage, meta: { guestOnly: true } },
    { path: '/lost-password', component: LostPasswordPage, meta: { guestOnly: true } },
    { 
        path: '/', 
        component: AdminPageView,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                component: Dashboard
            },
            {
                path: '/posts',
                component: PostsPage
            },
            {
                path: '/posts/new',
                component: PostEditor
            },
            {
                path: '/posts/:id/edit',
                component: PostEditor
            },
            {
                path: '/media',
                component: MediaPage
            },
            {
                path: '/comments',
                component: CommentsPage
            },
            {
                path: '/pages',
                component: PagesPage
            },
            {
                path: '/pages/new',
                component: PageEditor
            },
            {
                path: '/pages/:id/edit',
                component: PageEditor
            },
            {
                path: '/categories',
                component: CategoriesPage
            },
            {
                path: '/tags',
                component: TagsPage
            },
            {
                path: '/users',
                component: UsersPage
            },
            {
                path: '/users/new',
                component: AddUser
            },
            {
                path: '/users/profile',
                component: UserProfile
            }
        ] 
    },
  ]
});

router.beforeEach((to) => {
    const auth = useAuthStore(pinia);
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        return { path: '/login', query: { redirect: to.fullPath } };
    }
    if (to.meta.guestOnly && auth.isAuthenticated && to.path === '/login') {
        return '/';
    }
    return true;
});

export default router;