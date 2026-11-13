<script setup>
import { ArrowUpRight, FilePlus2, FileText, Image, MessageSquare, Users } from '@lucide/vue';

const shortcuts = [
    { label: 'Write a post', detail: 'Start a new article', to: '/posts/new', icon: FilePlus2 },
    { label: 'Manage posts', detail: 'Review and edit articles', to: '/posts', icon: FileText },
    { label: 'Open media library', detail: 'Browse uploaded files', to: '/media', icon: Image },
    { label: 'Review comments', detail: 'Moderate reader responses', to: '/comments', icon: MessageSquare },
    { label: 'Manage users', detail: 'View publication accounts', to: '/users', icon: Users }
];
</script>

<template>
    <section class="dashboard">
        <header class="screen-header">
            <div>
                <p class="dashboard__eyebrow">YOUR PUBLICATION</p>
                <h1>Dashboard</h1>
            </div>
            <RouterLink class="button button--primary" to="/posts/new"><FilePlus2 :size="15" /> New post</RouterLink>
        </header>

        <div class="dashboard__welcome">
            <div>
                <p class="dashboard__welcome-label">WORKSPACE</p>
                <h2>Good to have you back.</h2>
                <p>Pick up where you left off across your content and community.</p>
            </div>
            <RouterLink to="/pages/new">Create a page <ArrowUpRight :size="15" /></RouterLink>
        </div>

        <section class="dashboard__section" aria-labelledby="shortcuts-heading">
            <div class="dashboard__section-heading">
                <h2 id="shortcuts-heading">Quick access</h2>
                <span>ADMINISTRATION</span>
            </div>
            <div class="dashboard__links">
                <RouterLink v-for="item in shortcuts" :key="item.to" class="dashboard-link" :to="item.to">
                    <span class="dashboard-link__icon"><component :is="item.icon" :size="18" /></span>
                    <span class="dashboard-link__text"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
                    <ArrowUpRight class="dashboard-link__arrow" :size="15" />
                </RouterLink>
            </div>
        </section>
    </section>
</template>

<style lang="scss" scoped>
.dashboard {
    width: 100%;
    padding-bottom: 32px;
}

.screen-header {
    align-items: center;
    margin-bottom: 20px;
}

.dashboard__eyebrow,
.dashboard__welcome-label {
    margin-bottom: 5px;
    color: #646970;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
}

.dashboard__welcome {
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 26px 30px;
    border-left: 4px solid #2271b1;
    background: #fff;

    h2 {
        margin-bottom: 8px;
        font-size: 21px;
        font-weight: 500;
    }

    p:not(.dashboard__welcome-label) {
        color: #646970;
        line-height: 1.5;
    }

    > a {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
    }
}

.dashboard__section {
    margin-top: 30px;
}

.dashboard__section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid #c3c4c7;

    h2 {
        font-size: 16px;
        font-weight: 600;
    }

    span {
        color: #646970;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .8px;
    }
}

.dashboard__links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 28px;
}

.dashboard-link {
    min-width: 0;
    min-height: 76px;
    display: flex;
    align-items: center;
    gap: 13px;
    border-bottom: 1px solid #dcdcde;
    color: #1d2327;

    &:hover .dashboard-link__arrow {
        color: #2271b1;
        transform: translate(2px, -2px);
    }
}

.dashboard-link__icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    display: grid;
    place-items: center;
    color: #2271b1;
    background: #e7f2fa;
}

.dashboard-link__text {
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;

    strong {
        font-weight: 600;
    }

    small {
        overflow: hidden;
        color: #646970;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.dashboard-link__arrow {
    flex: 0 0 auto;
    color: #8c8f94;
    transition: color .15s ease, transform .15s ease;
}

@media (max-width: 700px) {
    .dashboard__welcome {
        align-items: flex-start;
        flex-direction: column;
        padding: 22px 18px;
    }

    .dashboard__links {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
