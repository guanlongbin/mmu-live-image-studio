import './tailwind.css';
import { createApp } from 'vue';
import { setGlobalNotify } from '@ks-data/utils';
import { useToast } from '@ks-data/composables';
import App from './App.vue';
import router from './router';

// 在所有请求发起之前注入全局 Toast 错误通知，
// 确保 request() 报错时能自动弹 Toast
setGlobalNotify((msg) => useToast().error(msg));

createApp(App).use(router).mount('#app');
