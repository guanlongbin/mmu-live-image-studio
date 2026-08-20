<!-- 首页：DataAgent 欢迎页。头像 + 「欢迎 xxx 使用 DataAgent」+ 数据智能体风格动效 -->
<!-- 使用 @headlessui/vue + Tailwind CSS (tw- prefix) -->
<template>
    <section class="tw-relative tw-min-h-screen tw-overflow-hidden tw-flex tw-items-center tw-justify-center tw-bg-[var(--bg_layout)] tw-transition-colors tw-duration-400">
        <!-- ===== 背景动效层 ===== -->
        <div class="tw-absolute tw-inset-0 tw-overflow-hidden">
            <div class="blob blob-1"></div>
            <div class="blob blob-2"></div>
            <div class="blob blob-3"></div>

            <!-- 数据网络：节点 + 流动连线 -->
            <svg class="net tw-absolute tw-inset-0 tw-w-full tw-h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                <g class="links">
                    <line x1="120" y1="140" x2="360" y2="90" />
                    <line x1="360" y1="90" x2="620" y2="180" />
                    <line x1="120" y1="140" x2="240" y2="380" />
                    <line x1="240" y1="380" x2="520" y2="460" />
                    <line x1="520" y1="460" x2="620" y2="180" />
                    <line x1="360" y1="90" x2="520" y2="460" />
                    <line x1="240" y1="380" x2="620" y2="180" />
                    <line x1="660" y1="420" x2="520" y2="460" />
                </g>
                <g class="nodes">
                    <circle cx="120" cy="140" r="4" />
                    <circle cx="360" cy="90" r="5" />
                    <circle cx="620" cy="180" r="4" />
                    <circle cx="240" cy="380" r="5" />
                    <circle cx="520" cy="460" r="4" />
                    <circle cx="660" cy="420" r="3" />
                </g>
            </svg>
        </div>

        <!-- ===== 前景内容 ===== -->
        <div class="tw-relative tw-z-10 tw-text-center tw-px-6">
            <!-- 头像区域 -->
            <div v-if="account" class="tw-relative tw-w-28 tw-h-28 tw-mx-auto tw-mb-7 animate-rise">
                <span class="ring"></span>
                <span class="halo"></span>
                <img
                    class="tw-absolute tw-inset-0 tw-w-28 tw-h-28 tw-rounded-full tw-object-cover tw-border-4 tw-border-[var(--bg_layout)] tw-bg-[var(--bg_contain)] tw-transition-colors tw-duration-400"
                    :src="account.avatar"
                    :alt="displayName"
                    referrerpolicy="no-referrer"
                />
                <span class="online"></span>
            </div>

            <!-- 欢迎标题 -->
            <h1 class="tw-m-0 tw-text-[38px] tw-font-extrabold tw-leading-[1.35] tw-tracking-[0.5px] tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400 animate-rise-delay-1 max-sm:tw-text-[28px]">
                欢迎
                <span class="name-gradient">{{ displayName }}</span>
                使用
                <span class="brand-shimmer">DataAgent</span>
            </h1>

            <!-- 副标题 -->
            <p class="tw-mt-[18px] tw-mx-auto tw-mb-0 tw-max-w-[540px] tw-text-[15px] tw-leading-[1.7] tw-text-[var(--text_secondary)] tw-transition-colors tw-duration-400 animate-rise-delay-2">{{ subtitle }}</p>

            <!-- 状态 Chip -->
            <div class="tw-mt-7 tw-flex tw-items-center tw-justify-center tw-gap-3 tw-flex-wrap animate-rise-delay-3">
                <span class="tw-inline-flex tw-items-center tw-gap-2 tw-px-[18px] tw-py-2 tw-text-[13px] tw-text-[var(--text_secondary)] tw-bg-[var(--bg_tag)] tw-border tw-border-[var(--border_divider)] tw-rounded-full tw-transition-colors tw-duration-400">
                    <i class="status-dot"></i>
                    您已接入 DataAgent
                </span>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getQueryMeta } from '@/services/api';
import { useCurrentUser } from '@ks-data/composables';

const { user: account } = useCurrentUser();
const queryMeta = ref<any>(null);

const displayName = computed(() => account.value?.displayName || account.value?.userName || '');
const subtitle = computed(
    () => queryMeta.value?.description || '让数据看得见，问题找得准，分析更简单 —— 你的智能数据助手已就绪',
);

watch(
    account,
    async (u) => {
        if (!u || queryMeta.value) return;
        try {
            queryMeta.value = await getQueryMeta();
        } catch {
            // 业务接口失败不影响欢迎页展示
        }
    },
    { immediate: true },
);
</script>

<style scoped>
/* ===== 暗色下显示彩色 blob，亮色下隐藏 ===== */
.blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0;
    will-change: transform;
    transition: opacity 0.4s ease;
}
:root[theme='dark'] .blob { opacity: 0.4; }
.blob-1 {
    width: 420px; height: 420px;
    left: -80px; top: -60px;
    background: #4f46e5;
    animation: float 16s ease-in-out infinite;
}
.blob-2 {
    width: 380px; height: 380px;
    right: -60px; top: 20%;
    background: #06b6d4;
    animation: float 20s ease-in-out infinite reverse;
}
.blob-3 {
    width: 360px; height: 360px;
    left: 35%; bottom: -120px;
    background: #a855f7;
    animation: float 18s ease-in-out infinite 2s;
}
@keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(40px, -30px) scale(1.12); }
    66%       { transform: translate(-30px, 25px) scale(0.92); }
}

/* ===== SVG 网络 ===== */
.net { opacity: 0; transition: opacity 0.4s ease; }
:root[theme='dark'] .net { opacity: 0.45; }
.net .links line {
    stroke: rgba(120, 160, 255, 0.35);
    stroke-width: 1;
    stroke-dasharray: 6 10;
    animation: flow 4s linear infinite;
}
.net .links line:nth-child(even) {
    animation-duration: 6s;
    stroke: rgba(94, 234, 212, 0.3);
}
@keyframes flow { to { stroke-dashoffset: -160; } }
.net .nodes circle {
    fill: #8ab4ff;
    filter: drop-shadow(0 0 6px rgba(120, 170, 255, 0.9));
    animation: twinkle 3s ease-in-out infinite;
}
.net .nodes circle:nth-child(2n) { fill: #5eead4; animation-delay: 1s; }
.net .nodes circle:nth-child(3n) { animation-delay: 2s; }
@keyframes twinkle {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.5); }
}

/* ===== 头像装饰 ===== */
.ring, .halo {
    position: absolute;
    inset: -7px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, #22d3ee, #6366f1, #a855f7, #f472b6, #22d3ee);
    animation: spin 6s linear infinite;
}
.halo { inset: -16px; filter: blur(18px); opacity: 0.7; }
.online {
    position: absolute;
    right: 6px; bottom: 6px;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: var(--bg_positive);
    border: 3px solid var(--bg_layout);
    animation: pulse 2s ease-out infinite;
    z-index: 2;
    transition: border-color 0.4s, background 0.4s;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse {
    0%   { box-shadow: 0 0 0 0 var(--bg_positive_disable); }
    100% { box-shadow: 0 0 0 12px transparent; }
}

/* ===== 渐变文字 ===== */
.name-gradient {
    background: linear-gradient(90deg, #22d3ee, #818cf8);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.brand-shimmer {
    background: linear-gradient(90deg, #22d3ee, #6366f1, #a855f7, #22d3ee);
    background-size: 220% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite;
}
@keyframes shimmer { to { background-position: 220% center; } }

/* ===== 状态点 ===== */
.status-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--bg_positive);
    box-shadow: 0 0 8px var(--bg_positive);
    animation: blink 1.6s ease-in-out infinite;
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
}

/* ===== 入场动画 ===== */
.animate-rise          { animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
.animate-rise-delay-1  { animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both; }
.animate-rise-delay-2  { animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both; }
.animate-rise-delay-3  { animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both; }
@keyframes rise {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
}
</style>
