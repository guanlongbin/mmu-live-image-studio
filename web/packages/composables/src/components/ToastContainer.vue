<!--
  全局 Toast 容器组件
  挂到 App.vue 根层级，无需 props 传参，全程通过 useToast() 驱动。
  支持四种类型：error / success / warn / info
  支持点击 × 手动关闭，支持进入/离开动画。
-->
<template>
    <Teleport to="body">
        <div class="toast-container" aria-live="polite" aria-atomic="false">
            <TransitionGroup name="toast">
                <div
                    v-for="item in toasts"
                    :key="item.id"
                    :class="['toast-item', `toast-item--${item.type}`]"
                    role="alert"
                >
                    <!-- 左侧图标 -->
                    <span class="toast-icon" aria-hidden="true">
                        <component :is="iconMap[item.type]" class="toast-icon-svg" />
                    </span>

                    <!-- 消息文本 -->
                    <span class="toast-message">{{ item.message }}</span>

                    <!-- 关闭按钮 -->
                    <button
                        class="toast-close"
                        aria-label="关闭"
                        @click="toast.remove(item.id)"
                    >
                        <XMarkIcon class="toast-close-icon" />
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../useToast';
import {
    XCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XMarkIcon,
} from '@heroicons/vue/24/solid';

const toast = useToast();
const { toasts } = toast;

const iconMap = {
    error:   XCircleIcon,
    success: CheckCircleIcon,
    warn:    ExclamationTriangleIcon,
    info:    InformationCircleIcon,
};
</script>

<style scoped>
/* ===== 容器：右上角定位，flex 列，Toast 从上往下叠 ===== */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none; /* 容器本身不拦截鼠标，子项再打开 */
    max-width: 380px;
    width: calc(100vw - 40px);
}

/* ===== 单条 Toast ===== */
.toast-item {
    pointer-events: all;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid transparent;
    font-size: 13px;
    line-height: 1.55;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    backdrop-filter: blur(4px);
    /* 平滑主题切换 */
    transition: background 0.3s, border-color 0.3s, color 0.3s;
}

/* — error — */
.toast-item--error {
    background: var(--bg_negative_contain, #fff2f0);
    border-color: var(--border_negative, #ffccc7);
    color: var(--text_negative, #cf1322);
}
/* — success — */
.toast-item--success {
    background: var(--bg_positive_contain, #f6ffed);
    border-color: var(--border_positive, #b7eb8f);
    color: var(--text_positive, #389e0d);
}
/* — warn — */
.toast-item--warn {
    background: var(--bg_warning_contain, #fffbe6);
    border-color: var(--border_warning, #ffe58f);
    color: var(--text_warning, #d46b08);
}
/* — info — */
.toast-item--info {
    background: var(--bg_brand_contain, #e8f0fe);
    border-color: var(--border_brand, #adc6ff);
    color: var(--text_brand, #1d39c4);
}

/* 暗色主题覆盖 */
:root[theme='dark'] .toast-item--error {
    background: rgba(207, 19, 34, 0.15);
    border-color: rgba(207, 19, 34, 0.35);
    color: #ff7875;
}
:root[theme='dark'] .toast-item--success {
    background: rgba(56, 158, 13, 0.15);
    border-color: rgba(56, 158, 13, 0.35);
    color: #95de64;
}
:root[theme='dark'] .toast-item--warn {
    background: rgba(212, 107, 8, 0.15);
    border-color: rgba(212, 107, 8, 0.35);
    color: #ffd666;
}
:root[theme='dark'] .toast-item--info {
    background: rgba(37, 99, 244, 0.15);
    border-color: rgba(37, 99, 244, 0.35);
    color: #91caff;
}

/* ===== 图标 ===== */
.toast-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
}
.toast-icon-svg {
    width: 16px;
    height: 16px;
}

/* ===== 文字 ===== */
.toast-message {
    flex: 1;
    word-break: break-word;
}

/* ===== 关闭按钮 ===== */
.toast-close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.55;
    color: inherit;
    transition: opacity 0.15s, background 0.15s;
}
.toast-close:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.08);
}
:root[theme='dark'] .toast-close:hover {
    background: rgba(255, 255, 255, 0.12);
}
.toast-close-icon {
    width: 13px;
    height: 13px;
}

/* ===== 进入 / 离开动画 ===== */
.toast-enter-active,
.toast-leave-active {
    transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-enter-from {
    opacity: 0;
    transform: translateX(40px);
}
.toast-leave-to {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
}
/* 列表其他项平滑移位 */
.toast-move {
    transition: transform 0.3s ease;
}
</style>
