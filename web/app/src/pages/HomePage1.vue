<!-- 构建中状态页：网站正在构建时的空状态展示 -->
<template>
    <section class="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-[#f5f6f8] tw-transition-colors tw-duration-400">
        <div class="tw-flex tw-flex-col tw-items-center tw-gap-3 animate-rise">
            <!-- 骨架屏：严格还原设计稿 -->
            <div class="tw-relative tw-w-[200px] tw-rounded-md tw-overflow-hidden tw-flex tw-flex-col tw-gap-1.5">
                <!-- 顶部：一整条全宽圆角矩形 -->
                <div class="tw-w-full tw-h-[18px] tw-rounded-[5px] tw-flex-shrink-0" style="background: #dde1e9"></div>

                <!-- 主区域：左列大块 + 右列3个小块 -->
                <div class="tw-flex tw-gap-1.5 tw-items-stretch">
                    <div class="tw-flex tw-flex-col" style="flex: 6">
                        <span class="tw-block tw-w-full tw-h-[90px] tw-rounded-[5px]" style="background: #e4e8ef"></span>
                    </div>
                    <div class="tw-flex tw-flex-col tw-gap-1.5" style="flex: 3.6">
                        <span class="tw-block tw-w-full tw-flex-1 tw-rounded-[5px]" style="background: #edf0f5"></span>
                        <span class="tw-block tw-w-full tw-flex-1 tw-rounded-[5px]" style="background: #edf0f5"></span>
                        <span class="tw-block tw-w-full tw-flex-1 tw-rounded-[5px]" style="background: #edf0f5"></span>
                    </div>
                </div>

                <!-- 底部：左一块 + 右一块 -->
                <div class="tw-flex tw-gap-1.5 tw-flex-shrink-0">
                    <span class="tw-h-7 tw-rounded-[5px]" style="flex: 6; background: #edf0f5"></span>
                    <span class="tw-h-7 tw-rounded-[5px]" style="flex: 3.6; background: #edf0f5"></span>
                </div>

                <!-- shimmer 扫光 -->
                <div class="sk-shimmer tw-absolute tw-inset-0 tw-pointer-events-none"></div>
            </div>

            <!-- 文案：... 三个点逐个跳动 -->
            <p class="tw-m-0 tw-text-sm tw-font-semibold tw-leading-[22px] tw-text-[#1a1a1a] tw-text-center">
                网站开发中
                <span class="tw-inline-flex tw-items-end tw-gap-px tw-align-baseline">
                    <span class="dot tw-inline-block tw-leading-none" style="animation-delay: 0s">.</span>
                    <span class="dot tw-inline-block tw-leading-none" style="animation-delay: 0.2s">.</span>
                    <span class="dot tw-inline-block tw-leading-none" style="animation-delay: 0.4s">.</span>
                </span>
            </p>
            <p class="tw-m-0 tw-text-sm tw-font-normal tw-leading-[22px] tw-text-[#8c8c8c] tw-text-center">
                请继续与DataAgent对话来构建~
            </p>
        </div>
    </section>
</template>

<script setup lang="ts">
// 纯展示页，无需数据请求
</script>

<style scoped>
/* ===== shimmer 扫光动效 ===== */
.sk-shimmer {
    background: linear-gradient(
        100deg,
        transparent 30%,
        rgba(255, 255, 255, 0.55) 50%,
        transparent 70%
    );
    background-size: 200% 100%;
    animation: shimmer-sweep 1.8s ease-in-out infinite;
}
@keyframes shimmer-sweep {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ===== ... 三个点跳动动效 ===== */
.dot {
    animation: dot-bounce 1.2s ease-in-out infinite;
}
@keyframes dot-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 1; }
    30%            { transform: translateY(-4px); opacity: 0.6; }
}

/* ===== 入场动画 ===== */
.animate-rise {
    animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes rise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}
</style>
