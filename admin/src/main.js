import { createApp, h } from 'vue';
import { RouterView } from 'vue-router';
import router from './router';
import pinia from './stores/pinia';
import './style.scss';

const Root = { render: () => h(RouterView) };

createApp(Root).use(pinia).use(router).mount('#app');