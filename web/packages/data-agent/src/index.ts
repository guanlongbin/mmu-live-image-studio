/**
 * @ks-data/data-agent 包入口
 *
 * 提供两类导出：
 * 1. composable — useDataAgent（流式分析状态管理，零 UI 依赖）
 * 2. 组件       — AgentPanel（独立右侧面板，传 content 自动分析）
 *                 AgentAnalysis（一体化触发 + 渲染组件，自定义 UI 用）
 *                 ExecuteProcessView / ConclusionView（SDK 原始渲染组件）
 *
 * 快速接入示例：
 * ```vue
 * <template>
 *   <div :style="open ? { marginRight: '600px' } : {}">
 *     <button @click="ask('分析今日DAU')">AI 分析</button>
 *   </div>
 *   <AgentPanel v-model="open" :content="question" />
 * </template>
 *
 * <script setup>
 * import { ref } from 'vue';
 * import { AgentPanel } from '@ks-data/data-agent';
 *
 * const open = ref(false);
 * const question = ref('');
 * function ask(q) { question.value = q; open.value = true; }
 * </script>
 * ```
 */

// composables
export { useDataAgent } from './composables/useDataAgent';
export type { UseDataAgentOptions } from './composables/useDataAgent';

// 组件
export { AgentPanel, AgentAnalysis, ExecuteProcessView, ConclusionView } from './components/index';

// SDK 样式（静态引入，打包进 dist/index.css，消费方无需单独 import）
import '@ks-data/data-agent-sdk/dist/index.css';
