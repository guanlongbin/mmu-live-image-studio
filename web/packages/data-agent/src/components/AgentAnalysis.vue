<!-- 
  AgentAnalysis — AI 分析触发 + 结果渲染一体化组件
  
  用法：
  ```vue
  <AgentAnalysis
    :agent-id="426"
    button-label="开始 AI 分析"
    :content="'帮我分析昨天的销售数据'"
  />
  ```
  
  如需动态 content（如输入框），使用 #trigger 插槽：
  ```vue
  <AgentAnalysis :agent-id="426">
    <template #trigger="{ analyze, isStreaming }">
      <button @click="analyze('帮我分析')">{{ isStreaming ? '分析中...' : '开始分析' }}</button>
    </template>
  </AgentAnalysis>
  ```
-->
<template>
    <div class="agent-analysis">
        <!-- trigger 区：默认渲染按钮，可通过 #trigger 插槽完全自定义 -->
        <slot
            name="trigger"
            :analyze="handleAnalyze"
            :is-streaming="isStreaming"
            :is-ready="isReady"
            :cancel="cancel"
            :reset="reset"
        >
            <div class="agent-analysis__toolbar">
                <button
                    class="agent-analysis__btn"
                    :class="{ 'agent-analysis__btn--streaming': isStreaming }"
                    :disabled="!isReady || isStreaming"
                    @click="handleAnalyze"
                >
                    <span v-if="isStreaming" class="agent-analysis__spinner" />
                    {{ isStreaming ? '分析中...' : (buttonLabel || '开始 AI 分析') }}
                </button>
                <button
                    v-if="isStreaming"
                    class="agent-analysis__btn agent-analysis__btn--cancel"
                    @click="cancel"
                >
                    取消
                </button>
                <button
                    v-if="hasResult && !isStreaming"
                    class="agent-analysis__btn agent-analysis__btn--ghost"
                    @click="reset"
                >
                    重新分析
                </button>
            </div>
        </slot>

        <!-- 错误提示 -->
        <div v-if="error" class="agent-analysis__error">
            ⚠️ {{ error }}
        </div>

        <!-- 分析结果渲染区 -->
        <div v-if="hasResult" class="agent-analysis__result">
            <!-- 执行过程 -->
            <ExecuteProcessView
                v-if="processItems.length"
                :items="processItems"
                class="agent-analysis__process"
            />
            <!-- 流式加载中占位 -->
            <div v-if="isStreaming && !processItems.length" class="agent-analysis__loading">
                <span class="agent-analysis__spinner" />
                <span>正在分析中，请稍候...</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

import { computed } from 'vue';
import { useDataAgent } from '../composables/useDataAgent';
import { ExecuteProcessView } from '@ks-data/data-agent-sdk/renderer';

interface Props {
    /** Agent ID（独立模式必填） */
    agentId?: number;
    /** 点击按钮时发送的消息文本；若使用 #trigger 插槽则由插槽自行调用 analyze(content) */
    content?: string;
    /** 默认按钮文案 */
    buttonLabel?: string;
    /** 主题 */
    theme?: 'dark' | 'light';
}

const props = withDefaults(defineProps<Props>(), {
    content: '',
    buttonLabel: '开始 AI 分析',
    theme: 'light',
    agentId: 515,
});

const emit = defineEmits<{
    /** 分析开始时触发 */
    (e: 'analyze-start', content: string): void;
    /** 分析完成时触发 */
    (e: 'analyze-complete', result: { processItems: any[]; conclusion: string }): void;
    /** 发生错误时触发 */
    (e: 'error', message: string): void;
}>();
const {
    isReady,
    isStreaming,
    error,
    processItems,
    analyze,
    cancel,
    reset,
} = useDataAgent({ agentId: props.agentId || 515, theme: props.theme });

const hasResult = computed(() => processItems.value.length > 0 || isStreaming.value);

async function handleAnalyze(content?: string) {
    const text = content || props.content;
    if (!text) {
        console.warn('[AgentAnalysis] content is empty, please pass a non-empty string');
        return;
    }
    emit('analyze-start', text);
    await analyze(text);
    emit('analyze-complete', { processItems: processItems.value });
}

// 对外暴露 analyze 方法，支持父组件调用（如 ref.analyze(content)）
defineExpose({ analyze: handleAnalyze, cancel, reset, isStreaming, isReady });
</script>

<style scoped>
.agent-analysis {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.agent-analysis__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.agent-analysis__btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 8px;
    border: 1px solid var(--border_brand, #2563f4);
    background: var(--bg_brand_contain, rgba(37, 99, 244, 0.08));
    color: var(--text_brand, #2563f4);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s;
    white-space: nowrap;
}

.agent-analysis__btn:hover:not(:disabled) {
    background: var(--bg_hover, rgba(37, 99, 244, 0.14));
}

.agent-analysis__btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.agent-analysis__btn--streaming {
    opacity: 0.8;
}

.agent-analysis__btn--cancel {
    border-color: var(--border_divider, #e0e0e2);
    background: var(--bg_component, #fff);
    color: var(--text_secondary, #666);
}

.agent-analysis__btn--ghost {
    border-color: var(--border_divider, #e0e0e2);
    background: transparent;
    color: var(--text_tertiary, #999);
}

/* 旋转加载指示器 */
.agent-analysis__spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.agent-analysis__error {
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--bg_warning_notice, rgba(255, 170, 0, 0.08));
    border: 1px solid var(--bg_warning_tag, rgba(255, 170, 0, 0.3));
    color: var(--text_warning, #d97706);
    font-size: 13px;
}

.agent-analysis__result {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.agent-analysis__loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text_tertiary, #999);
    font-size: 13px;
    padding: 12px 0;
}

/* ExecuteProcessView / ConclusionView 外层容器边距清零 */
.agent-analysis__process,
.agent-analysis__conclusion {
    margin: 0;
}
:deep(.status-icon) {
    img {
        max-width: inherit;
    }
}
:deep(#sdk-execute-process-view .execute-process-item__title-arrow) {
    margin-top: 2px !important;
}
</style>
