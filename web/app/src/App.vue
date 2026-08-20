<!-- 布局外壳：身份校验门控 + 权限校验门控 + 全屏路由出口（无顶部导航，各页面自管理布局） -->
<template>
    <div class="app">
        <ToastContainer />
        <div v-if="loading" class="boot">
            <div class="boot-orb"></div>
            <p class="boot-text">访问权限确认中...</p>
        </div>
        <div v-else-if="error" class="boot">
            <p class="boot-text error">登录校验失败：{{ error }}</p>
        </div>
        <div v-else-if="!auth" class="boot">
            <img src="@/assets/no-auth.png" alt="" style="width: 64px; height: 64px" />
            <div class="no-permission-message">
                您还没有查看此网站的权限，点此<a :href="applyUrl" target="_blank">申请权限</a>，或联系负责人
                <KimWithUser
                    class="share-user share-detail"
                    :name="owner"
                    :reverse="true"
                />
                授予权限
            </div>
            <button class="ask-agent-btn" @click="handleInnerAsk">
                <img class="ask-agent-btn__icon" src="@/assets/new-chat-plain.svg" alt="" />
                <span>去DataAgent提问</span>
            </button>
        </div>
        <RouterView v-else />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { RouterView } from 'vue-router';
import { useCurrentUser, ToastContainer, KimWithUser } from '@ks-data/composables';
import {
    initWaterMark,
    initWebLogger,
    initGlobalErrorCapture,
    isInKimAppMobile,
    openNewPage,
} from '@ks-data/utils';

// 进入应用即做身份校验（生产环境未登录会跳转 SSO）；登录后自动校验访问权限
const { user, loading, error, auth, owner, applyUrl, load } = useCurrentUser();

// 用户登录成功后初始化水印 + WebLogger + Radar（权限校验由 useCurrentUser 内部触发）
watch(user, (u) => {
    if (u?.userName) {
        initWaterMark(u.userName, u.displayName);
        // 初始化埋点与监控（幂等，已初始化则直接返回已有实例）
        initWebLogger(u.userName);
        // 开启全局 console.error 捕获，自动上报到 Radar
        initGlobalErrorCapture();
    }
});

/**
 * Kim 移动端全局 <a target="_blank"> 点击拦截
 * Kim WebView 不支持 window.open 新标签，需改用 webview.open bridge
 */
const handleKimAnchorClick = (e: MouseEvent) => {
    const anchor = (e.target as Element)?.closest('a');
    if (!anchor) return;
    if (anchor.target !== '_blank') return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
    e.preventDefault();
    openNewPage(href);
};

let kimAnchorClickCleanup: (() => void) | null = null;

const handleInnerAsk = () => {
    openNewPage(__DATA_AGENT_ORIGIN__);
};

onMounted(() => {
    load();

    // Kim 移动端：全局拦截 <a target="_blank"> 点击，改用 webview.open bridge
    if (isInKimAppMobile()) {
        document.addEventListener('click', handleKimAnchorClick, true);
        kimAnchorClickCleanup = () =>
            document.removeEventListener('click', handleKimAnchorClick, true);
    }
});

onUnmounted(() => {
    // 清理 Kim 移动端 <a target="_blank"> 拦截器
    kimAnchorClickCleanup?.();
    kimAnchorClickCleanup = null;
});

</script>

<style>
/* ===== 全局基础样式 ===== */
* {
    box-sizing: border-box;
}
body {
    margin: 0;
    transition: background-color 0.3s ease, color 0.3s ease;
}
.app {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ===== Boot 加载屏 ===== */
.boot {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background-color: var(--bg_layout);
    transition: background-color 0.4s ease;
}
.boot-orb {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, #22d3ee, #6366f1, #a855f7, #22d3ee);
    animation: boot-spin 1s linear infinite;
    filter: blur(1px);
    box-shadow: 0 0 36px rgba(99, 102, 241, 0.7);
}
.boot-text {
    color: var(--text_secondary);
    font-size: 14px;
    letter-spacing: 1px;
    transition: color 0.4s;
}
.boot-text.error {
    color: var(--text_negative);
}
@keyframes boot-spin {
    to {
        transform: rotate(360deg);
    }
}
.no-permission-message {
    display: flex;
    align-items: center;
    color: var(--text_secondary);
    font-size: 12px;
    a {
        color: #2563f4;
        cursor: pointer;
    }
}

/* ===== 去Agent提问 按钮 ===== */
.ask-agent-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 24px;
    border: none;
    border-radius: 8px;
    background-image: url('https://h2.static.yximgs.com/kos/nlav111868/button-2.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
}
.ask-agent-btn:hover {
    opacity: 0.88;
}
.ask-agent-btn__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: #fff;
}
</style>
