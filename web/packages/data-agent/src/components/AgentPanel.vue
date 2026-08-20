<!--
  AgentPanel — 完全独立的 DataAgent 右侧分析面板
  
  特性：
  - position: fixed，固定在视口右侧，不影响页面布局
  - 通过 v-model 控制显隐，面板内置关闭按钮
  - content prop 传入问题后自动触发分析，无需用户在面板内再次点击
  - 内置滑入/滑出过渡动画
  - 内置错误提示、重新分析、取消等操作
  
  用法（极简）：
  ```vue
  <template>
    <div :style="isPanelOpen ? { marginRight: '600px' } : {}">
      <button @click="openPanel('分析昨天的销售数据')">AI 分析</button>
    </div>
    <AgentPanel v-model="isPanelOpen" :content="question" />
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { AgentPanel } from '@ks-data/data-agent';
  
  const isPanelOpen = ref(false);
  const question = ref('');
  
  function openPanel(q) {
    question.value = q;
    isPanelOpen.value = true;
  }
  </script>
  ```
-->
<template>
    <Transition name="agent-panel">
        <div v-if="modelValue" class="agent-panel" :style="{ width: `${width}px` }">

            <!-- 头部 -->
            <div class="agent-panel__header">
                <div class="agent-panel__header-left">
                    <span class="agent-panel__icon">
                        <!-- sparkles svg -->
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.5 20l-4.9-3.56a1 1 0 0 0-1.18 0L6.5 20l1.87-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z"/>
                        </svg>
                    </span>
                    <span class="agent-panel__title">DataAgent 智能分析</span>
                </div>
                <!-- 操作区：重新分析 / 取消 / 关闭 -->
                <div class="agent-panel__header-right">
                    <button
                        v-if="hasResult && !isStreaming"
                        class="agent-panel__action-btn"
                        @click="handleReset"
                    >
                        重新分析
                    </button>
                    <button
                        v-if="isStreaming"
                        class="agent-panel__action-btn agent-panel__action-btn--cancel"
                        @click="cancel"
                    >
                        取消
                    </button>
                    <button class="agent-panel__close" @click="handleClose" aria-label="关闭面板">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- 当前问题 -->
            <div v-if="currentContent" class="agent-panel__question">
                <span class="agent-panel__question-label">问题</span>
                <span class="agent-panel__question-text">{{ currentContent.replace(promptAppendText, '') }}</span>
            </div>

            <!-- 内容区 -->
            <div ref="bodyRef" class="agent-panel__body" @scroll="onBodyScroll">
                <!-- 初始化中 -->
                <div v-if="!isReady" class="agent-panel__status">
                    <span class="agent-panel__spinner" />
                    <span>正在初始化 DataAgent…</span>
                </div>

                <!-- 流式加载中（尚无内容） -->
                <div v-else-if="isStreaming && !hasResult" class="agent-panel__status">
                    <span class="agent-panel__spinner" />
                    <span>AI 正在分析中，请稍候…</span>
                </div>

                <!-- 错误提示 -->
                <div v-if="error" class="agent-panel__error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{{ error }}</span>
                </div>

                <!-- 执行过程 + 结论 -->
                <template v-if="hasResult">
                    <ExecuteProcessView
                        v-if="processItems.length"
                        :items="processItems"
                        class="agent-panel__process"
                    />
                </template>
            </div>

        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useDataAgent, promptAppendText } from '../composables/useDataAgent';
import { ExecuteProcessView } from '@ks-data/data-agent-sdk/renderer';

interface Props {
    /** 控制面板显隐（v-model） */
    modelValue: boolean;
    /** 发送给 Agent 的问题，赋值后自动触发分析 */
    content?: string;
    /** Agent ID */
    agentId?: number;
    /** 面板宽度，默认 600 */
    width?: number;
    /** 主题，默认 'light' */
    theme?: 'dark' | 'light';
}

const props = withDefaults(defineProps<Props>(), {
    content: '',
    agentId: 515,
    width: 600,
    theme: 'light',
});

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

// ===== DataAgent 状态 =====
const { isReady, isStreaming, error, processItems, analyze, cancel, reset } = useDataAgent({
    agentId: props.agentId,
    theme: props.theme,
});

// 记录当前展示的问题文本
const currentContent = ref('');

// ===== 滚动容器引用 =====
const bodyRef = ref<HTMLElement | null>(null);
// 用户是否已手动向上滚动（streaming 中暂停自动滚动）
const userScrolledUp = ref(false);

function scrollToBottom() {
    nextTick(() => {
        const el = bodyRef.value;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    });
}

// 监听用户滚动：距底部 > 80px 认为是主动上滚，暂停自动滚动
function onBodyScroll() {
    const el = bodyRef.value;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.value = distFromBottom > 80;
}

// streaming 时，内容每次变化都滚动到底部（用户未主动上滚时）
watch(
    [processItems],
    () => {
        if (isStreaming.value && !userScrolledUp.value) scrollToBottom();
    },
    { deep: true },
);

// streaming 结束后重置上滚标记
watch(isStreaming, (streaming) => {
    if (!streaming) userScrolledUp.value = false;
});

const hasResult = computed(
    () => processItems.value.length > 0 || isStreaming.value,
);

// ===== 自动分析：content 变化 或 面板打开时触发 =====
watch(
    [() => props.modelValue, () => props.content],
    ([open, q]) => {
        if (open && q && q.trim()) {
            currentContent.value = q;
            // 等 SDK ready 后发送
            if (isReady.value) {
                triggerAnalyze(q);
            } else {
                // SDK 未就绪，等待 isReady 后再触发
                const stop = watch(isReady, (ready) => {
                    if (ready) {
                        triggerAnalyze(q);
                        stop();
                    }
                });
            }
        }
    },
    { immediate: true },
);

async function triggerAnalyze(q: string) {
    if (isStreaming.value) cancel();
    await analyze(q);
}

function handleReset() {
    reset();
    if (props.content) triggerAnalyze(props.content);
}

function handleClose() {
    cancel();
    emit('update:modelValue', false);
}
</script>

<style scoped>
/* ===== 固定面板 ===== */
.agent-panel {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg_layout, #ffffff);
    box-shadow: -6px 0 32px rgba(0, 0, 0, 0.1);
    z-index: 200;
    will-change: transform, opacity;
}

/* ===== 头部 ===== */
.agent-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 16px;
    flex-shrink: 0;
    gap: 8px;
}
.agent-panel__header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}
.agent-panel__header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
.agent-panel__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 7px;
    flex-shrink: 0;
}
.agent-panel__title {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
}

/* 头部操作按钮 */
.agent-panel__action-btn {
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--border_divider, #e0e0e2);
    background: transparent;
    color: var(--text_secondary, #666);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, color 0.15s;
}
.agent-panel__action-btn:hover {
    background: var(--bg_hover, #ebebed);
    color: var(--text_primary, #1a1a1a);
}
.agent-panel__action-btn--cancel {
    border-color: rgba(220, 38, 38, 0.3);
    color: #dc2626;
}
.agent-panel__action-btn--cancel:hover {
    background: rgba(220, 38, 38, 0.05);
}

.agent-panel__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

/* ===== 当前问题 ===== */
.agent-panel__question {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 16px;
    flex-shrink: 0;
    background: var(--bg_brand_contain, rgba(37, 99, 244, 0.04));
    border-bottom: 1px solid var(--border_divider, #e0e0e2);
}
.agent-panel__question-label {
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--text_brand, #2563f4);
    background: rgba(37, 99, 244, 0.1);
}
.agent-panel__question-text {
    font-size: 13px;
    line-height: 1.55;
    word-break: break-word;
    color: var(--text_primary, #1a1a1a);
}

/* ===== 内容区 ===== */
.agent-panel__body {
    flex: 1;
    min-height: 0;          /* 关键：允许 flex 子项收缩，使 overflow-y 生效 */
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
}
.agent-panel__body::-webkit-scrollbar { width: 5px; }
.agent-panel__body::-webkit-scrollbar-thumb { border-radius: 3px; }
.agent-panel__body::-webkit-scrollbar-track { background: transparent; }

/* 状态占位（loading） */
.agent-panel__status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 0;
    font-size: 13px;
}

/* 错误提示 */
.agent-panel__error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid rgba(220, 38, 38, 0.2);
    background: rgba(220, 38, 38, 0.05);
    color: #dc2626;
    font-size: 13px;
    line-height: 1.5;
}

/* ExecuteProcessView / ConclusionView 外层清零 */
.agent-panel__process,
.agent-panel__conclusion { margin: 0; }

:deep(.status-icon) img { max-width: inherit; }
:deep(#sdk-execute-process-view .execute-process-item__title-arrow) { margin-top: 2px !important; }

/* ===== 加载旋转动画 ===== */
.agent-panel__spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-radius: 50%;
    animation: panel-spin 0.7s linear infinite;
    flex-shrink: 0;
}
@keyframes panel-spin { to { transform: rotate(360deg); } }

/* ===== 滑入/滑出过渡 ===== */
.agent-panel-enter-active {
    transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}
.agent-panel-leave-active {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.6, 1),
                opacity 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}
.agent-panel-enter-from,
.agent-panel-leave-to  { transform: translateX(100%); opacity: 0; }
.agent-panel-enter-to,
.agent-panel-leave-from { transform: translateX(0);   opacity: 1; }
</style>
