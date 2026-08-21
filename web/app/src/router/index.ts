import { createRouter, createWebHistory } from 'vue-router';

/**
 * 路由表。新增页面就在 routes 里加一项：
 *  - 首屏/常用页：直接 import 组件
 *  - 次要页：用 () => import() 懒加载（会拆成独立 chunk，按需加载）
 */
const router = createRouter({
    // 用应用基础路径作为 history base，兼容被挂到子路径下（如沙箱 /view/<会话id>/<端口>/）
    history: createWebHistory(window.__APP_BASE__ || '/'),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/pages/HomePage1.vue'),
        },
        {
            path: '/about',
            name: 'about',
            component: () => import('@/pages/AboutPage.vue'),
        },
        {
            path: '/charts',
            name: 'charts',
            component: () => import('@/pages/ChartsPage.vue'),
        },
        {
            path: '/cases',
            name: 'cases',
            component: () => import('@/pages/CaseLibraryPage.vue'),
        },
        // {
        //     path: '/agent-demo',
        //     name: 'agent-demo',
        //     component: () => import('@/pages/AgentDemoPage.vue'),
        // },
    ],
});

export default router;
