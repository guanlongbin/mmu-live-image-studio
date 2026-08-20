<template>
    <!-- 主内容：面板打开时通过 margin-right 向左收缩 -->
    <div class="demo-main" :style="panelOpen ? { marginRight: PANEL_WIDTH + 'px' } : {}">

        <!-- 顶部导航 -->
        <header class="demo-topbar">
            <RouterLink to="/" class="demo-back-btn" aria-label="返回首页">
                <ArrowLeftIcon class="tw-w-4 tw-h-4" />
            </RouterLink>
            <div class="tw-flex-1 tw-min-w-0">
                <h1 class="demo-topbar__title">数据分析看板</h1>
                <p class="demo-topbar__sub">DataAgent 接入演示 · 点击「分析」按钮 AI 立即开始分析</p>
            </div>
            <button
                class="demo-ai-btn"
                :class="{ 'demo-ai-btn--active': panelOpen }"
                @click="panelOpen ? closePanel() : openPanel('对今日整体业务数据进行综合分析，找出异常指标并给出优化建议')"
            >
                <SparklesIcon class="tw-w-4 tw-h-4 tw-flex-shrink-0" />
                {{ panelOpen ? '收起面板' : 'AI 综合分析' }}
            </button>
        </header>

        <main class="demo-content">

            <!-- Banner：今日概况 -->
            <section class="demo-banner">
                <div class="demo-banner__left">
                    <p class="demo-banner__date">{{ todayLabel }} · 数据快照</p>
                    <h2 class="demo-banner__title">今日业务概况</h2>
                    <p class="demo-banner__desc">
                        今日整体表现良好，DAU 环比上升 3.2%，成交额略有回落。
                        点击下方按钮，DataAgent 将立即开始 AI 分析。
                    </p>
                    <div class="demo-banner__actions">
                        <button class="demo-ai-btn" @click="openPanel('对今日整体业务数据进行综合分析，找出异常并给出建议')">
                            <SparklesIcon class="tw-w-4 tw-h-4" />
                            AI 综合分析今日数据
                        </button>
                        <button class="demo-ai-btn demo-ai-btn--ghost" @click="openPanel('对比本周与上周核心指标变化趋势，列出差距最大的渠道')">
                            <ChartBarIcon class="tw-w-4 tw-h-4" />
                            周同比分析
                        </button>
                    </div>
                </div>
                <div class="demo-kpi-grid">
                    <div v-for="kpi in kpiList" :key="kpi.label" class="demo-kpi-card">
                        <p class="demo-kpi-card__label">{{ kpi.label }}</p>
                        <p class="demo-kpi-card__value">{{ kpi.value }}</p>
                        <span class="demo-kpi-badge" :class="kpi.up ? 'demo-kpi-badge--up' : 'demo-kpi-badge--down'">
                            <component :is="kpi.up ? ArrowUpIcon : ArrowDownIcon" class="tw-w-2.5 tw-h-2.5" />
                            {{ kpi.change }}
                        </span>
                    </div>
                </div>
            </section>

            <!-- 渠道来源分析表格 -->
            <section class="demo-section">
                <div class="demo-section-hd">
                    <div>
                        <h2 class="demo-section__title">渠道来源分析</h2>
                        <p class="demo-section__sub">近 7 日各渠道 DAU 及成交数据</p>
                    </div>
                    <button class="demo-ai-btn demo-ai-btn--sm" @click="openPanel('分析各渠道近7日的DAU和成交额趋势，找出表现最好和最差的渠道')">
                        <SparklesIcon class="tw-w-3.5 tw-h-3.5" />
                        分析渠道数据
                    </button>
                </div>
                <div class="demo-table-wrap">
                    <table class="demo-table">
                        <thead>
                            <tr>
                                <th>渠道</th>
                                <th>DAU</th>
                                <th>成交额</th>
                                <th>转化率</th>
                                <th>环比</th>
                                <th class="tw-text-right">AI 分析</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in channelRows" :key="row.channel">
                                <td>
                                    <span class="demo-channel-dot" :style="{ background: row.color }"></span>
                                    <span class="tw-font-medium">{{ row.channel }}</span>
                                </td>
                                <td>{{ row.dau }}</td>
                                <td>{{ row.gmv }}</td>
                                <td>
                                    <div class="demo-cvr-wrap">
                                        <div class="demo-cvr-bar" :style="{ width: row.cvr, background: row.color }"></div>
                                        <span>{{ row.cvr }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="demo-badge" :class="row.up ? 'demo-badge--up' : 'demo-badge--down'">{{ row.change }}</span>
                                </td>
                                <td class="tw-text-right">
                                    <button
                                        class="demo-row-btn"
                                        @click="openPanel(`深入分析「${row.channel}」渠道的用户行为和转化漏斗，找出问题并给出优化方向`)"
                                    >
                                        <SparklesIcon class="tw-w-3 tw-h-3" />
                                        分析
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- 异常指标监控 -->
            <section class="demo-section">
                <div class="demo-section-hd">
                    <div>
                        <h2 class="demo-section__title">异常指标监控</h2>
                        <p class="demo-section__sub">系统检测到以下指标存在异常，建议重点关注</p>
                    </div>
                </div>
                <div class="demo-alerts">
                    <div
                        v-for="alert in alertList"
                        :key="alert.metric"
                        class="demo-alert"
                        :class="`demo-alert--${alert.level}`"
                    >
                        <ExclamationTriangleIcon class="tw-w-4 tw-h-4 demo-alert__icon" />
                        <div class="tw-flex-1 tw-min-w-0">
                            <p class="demo-alert__metric">{{ alert.metric }}</p>
                            <p class="demo-alert__desc">{{ alert.desc }}</p>
                        </div>
                        <button
                            class="demo-ai-btn demo-ai-btn--sm"
                            @click="openPanel(`帮我分析「${alert.metric}」异常的根本原因，并给出改善建议`)"
                        >
                            <SparklesIcon class="tw-w-3.5 tw-h-3.5" />
                            AI 归因
                        </button>
                    </div>
                </div>
            </section>

            <!-- 快捷提问 -->
            <section class="demo-section">
                <h2 class="demo-section__title">快捷提问</h2>
                <p class="demo-section__sub tw-mb-3">选择预设问题，DataAgent 立即开始分析</p>
                <div class="demo-prompts">
                    <button
                        v-for="item in quickPrompts"
                        :key="item.text"
                        class="demo-prompt-btn"
                        @click="openPanel(item.text)"
                    >
                        <component :is="item.icon" class="tw-w-4 tw-h-4 tw-flex-shrink-0 tw-text-[var(--text_brand)]" />
                        <span class="tw-flex-1 tw-text-left">{{ item.text }}</span>
                        <ArrowRightIcon class="tw-w-3.5 tw-h-3.5 tw-text-[var(--text_tertiary)] tw-flex-shrink-0" />
                    </button>
                </div>
            </section>

        </main>
    </div>

    <!-- AgentPanel：完全独立组件，content 变化即自动触发分析 -->
    <AgentPanel v-model="panelOpen" :content="currentQuestion" :width="PANEL_WIDTH" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
    ArrowLeftIcon,
    SparklesIcon,
    ChartBarIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ExclamationTriangleIcon,
    TableCellsIcon,
    MagnifyingGlassIcon,
    BoltIcon,
} from '@heroicons/vue/24/outline';
import { AgentPanel } from '@ks-data/website-data-agent';
import '@ks-data/website-data-agent/dist/index.css'

const PANEL_WIDTH = 600;

// ===== 面板状态：仅 2 个变量 =====
const panelOpen = ref(false);
const currentQuestion = ref('');

function openPanel(q: string) {
    currentQuestion.value = q;
    panelOpen.value = true;
}

function closePanel() {
    panelOpen.value = false;
}

// ===== 静态数据 =====
const todayLabel = computed(() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
});

const kpiList = [
    { label: 'DAU',    value: '128.4万',   change: '+3.2%',  up: true  },
    { label: '成交额', value: '¥2,341万',  change: '-1.8%',  up: false },
    { label: '新增用户', value: '9,204',   change: '+7.5%',  up: true  },
    { label: '人均时长', value: '23.6 min', change: '+0.4%', up: true  },
];

const channelRows = [
    { channel: '搜索直达',   dau: '42.1万', gmv: '¥820万', cvr: '68%', change: '+5.1%',  up: true,  color: '#6366f1' },
    { channel: '推荐 Feed',  dau: '38.6万', gmv: '¥710万', cvr: '55%', change: '+2.3%',  up: true,  color: '#22d3ee' },
    { channel: '短视频引流', dau: '27.4万', gmv: '¥490万', cvr: '42%', change: '-3.6%',  up: false, color: '#f59e0b' },
    { channel: '直播间',     dau: '14.2万', gmv: '¥280万', cvr: '38%', change: '-1.2%',  up: false, color: '#ec4899' },
    { channel: '社交裂变',   dau: '6.1万',  gmv: '¥41万',  cvr: '22%', change: '+11.4%', up: true,  color: '#10b981' },
];

const alertList = [
    { metric: '短视频引流 DAU',  desc: '连续 3 日下滑，今日环比 -3.6%，低于预警阈值',     level: 'warn'  },
    { metric: '成交额',          desc: '较昨日下降 1.8%，需关注是否受节假日影响',          level: 'warn'  },
    { metric: '直播间转化率',    desc: '本周转化率均低于行业均值，建议排查话术与商品结构', level: 'error' },
];

const quickPrompts = [
    { text: '分析昨天用户活跃度趋势，找出峰值时间段',             icon: ChartBarIcon      },
    { text: '对比本周与上周各渠道成交额，找出差距最大的渠道',     icon: TableCellsIcon    },
    { text: '短视频引流 DAU 连续下滑的根本原因是什么？',          icon: MagnifyingGlassIcon },
    { text: '预测本月月末 DAU，给出置信区间',                     icon: BoltIcon          },
    { text: '直播间转化率偏低，有哪些优化建议？',                 icon: BoltIcon          },
];
</script>

<style scoped>
.demo-main {
    min-height: 100vh;
    background: var(--bg_layout);
    transition: margin-right 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== 顶部导航 ===== */
.demo-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    border-bottom: 1px solid var(--border_divider);
    background: var(--bg_component);
    position: sticky;
    top: 0;
    z-index: 10;
}
.demo-topbar__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text_primary);
    line-height: 1.4;
}
.demo-topbar__sub {
    margin: 0;
    font-size: 12px;
    color: var(--text_tertiary);
}
.demo-back-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--bg_contain);
    border: 1px solid var(--border_divider);
    color: var(--text_secondary);
    text-decoration: none;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}
.demo-back-btn:hover { background: var(--bg_hover); color: var(--text_primary); }

/* ===== 通用 AI 按钮 ===== */
.demo-ai-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 10px;
    border: none;
    background: var(--text_brand, #2563f4);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(37, 99, 244, 0.28);
}
.demo-ai-btn:hover {
    background: #1d52d4;
    box-shadow: 0 4px 16px rgba(37, 99, 244, 0.42);
    transform: translateY(-1px);
}
.demo-ai-btn--active {
    background: #1d52d4;
    box-shadow: 0 2px 12px rgba(37, 99, 244, 0.4);
}
.demo-ai-btn--ghost {
    background: var(--bg_brand_contain, rgba(37, 99, 244, 0.08));
    color: var(--text_brand, #2563f4);
    box-shadow: none;
    border: 1px solid var(--border_brand, #2563f4);
}
.demo-ai-btn--ghost:hover {
    background: rgba(37, 99, 244, 0.14);
    transform: translateY(-1px);
    box-shadow: none;
}
.demo-ai-btn--sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }

/* ===== 主内容区 ===== */
.demo-content {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* ===== Banner ===== */
.demo-banner {
    display: flex;
    gap: 24px;
    padding: 24px 28px;
    border-radius: 16px;
    background: var(--bg_component);
    border: 1px solid var(--border_divider);
    align-items: center;
    flex-wrap: wrap;
}
.demo-banner__left { flex: 1; min-width: 260px; }
.demo-banner__date  { margin: 0 0 4px;  font-size: 12px; color: var(--text_tertiary); }
.demo-banner__title { margin: 0 0 8px;  font-size: 20px; font-weight: 700; color: var(--text_primary); }
.demo-banner__desc  { margin: 0 0 20px; font-size: 13px; color: var(--text_secondary); line-height: 1.65; max-width: 420px; }
.demo-banner__actions { display: flex; gap: 10px; flex-wrap: wrap; }

.demo-kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    min-width: 260px;
}
.demo-kpi-card {
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--bg_contain);
    border: 1px solid var(--border_divider);
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.demo-kpi-card__label { margin: 0; font-size: 11px; color: var(--text_tertiary); }
.demo-kpi-card__value { margin: 0; font-size: 18px; font-weight: 700; color: var(--text_primary); letter-spacing: -0.3px; }
.demo-kpi-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
}
.demo-kpi-badge--up   { background: rgba(22,163,74,0.1);  color: #16a34a; }
.demo-kpi-badge--down { background: rgba(220,38,38,0.08); color: #dc2626; }

/* ===== Section ===== */
.demo-section-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}
.demo-section__title { margin: 0 0 2px; font-size: 15px; font-weight: 600; color: var(--text_primary); }
.demo-section__sub   { margin: 0; font-size: 12px; color: var(--text_tertiary); }

/* ===== 表格 ===== */
.demo-table-wrap { border: 1px solid var(--border_divider); border-radius: 12px; overflow: hidden; }
.demo-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.demo-table thead tr { background: var(--bg_contain); }
.demo-table th {
    padding: 10px 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: var(--text_tertiary);
    border-bottom: 1px solid var(--border_divider);
    white-space: nowrap;
}
.demo-table td {
    padding: 12px 16px;
    color: var(--text_primary);
    border-bottom: 1px solid var(--border_divider);
    vertical-align: middle;
}
.demo-table tbody tr:last-child td { border-bottom: none; }
.demo-table tbody tr:hover td { background: var(--bg_hover); }
.demo-channel-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
.demo-cvr-wrap { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text_secondary); }
.demo-cvr-bar  { height: 5px; border-radius: 3px; flex-shrink: 0; opacity: 0.7; }
.demo-badge { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 500; }
.demo-badge--up   { background: rgba(22,163,74,0.1);  color: #16a34a; }
.demo-badge--down { background: rgba(220,38,38,0.08); color: #dc2626; }
.demo-row-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--border_brand, #2563f4);
    background: transparent;
    color: var(--text_brand, #2563f4);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
}
.demo-row-btn:hover { background: var(--bg_brand_contain, rgba(37,99,244,0.08)); }

/* ===== 异常告警 ===== */
.demo-alerts { display: flex; flex-direction: column; gap: 8px; }
.demo-alert {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 12px;
    border: 1px solid;
}
.demo-alert--warn  { background: rgba(245,158,11,0.06);  border-color: rgba(245,158,11,0.3); }
.demo-alert--error { background: rgba(220,38,38,0.05);   border-color: rgba(220,38,38,0.25); }
.demo-alert__icon  { flex-shrink: 0; margin-top: 1px; }
.demo-alert--warn  .demo-alert__icon { color: #d97706; }
.demo-alert--error .demo-alert__icon { color: #dc2626; }
.demo-alert__metric { margin: 0 0 2px; font-size: 13px; font-weight: 600; color: var(--text_primary); }
.demo-alert__desc   { margin: 0; font-size: 12px; color: var(--text_secondary); line-height: 1.5; }

/* ===== 快捷提问 ===== */
.demo-prompts { display: flex; flex-direction: column; gap: 8px; }
.demo-prompt-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border_divider);
    background: var(--bg_component);
    color: var(--text_primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.demo-prompt-btn:hover {
    background: var(--bg_hover);
    border-color: var(--border_brand);
    box-shadow: 0 1px 8px rgba(37,99,244,0.1);
}

/* ===== AgentPanel 颜色定制 ===== */
:deep(.agent-panel) {
    background: var(--bg_component, #fff);
    border-left: 1px solid var(--border_divider, #e0e0e2);
}
:deep(.agent-panel__header) {
    border-bottom: 1px solid var(--border_divider, #e0e0e2);
}
:deep(.agent-panel__icon) {
    background: var(--bg_brand_contain, rgba(37, 99, 244, 0.08));
    color: var(--text_brand, #2563f4);
}
:deep(.agent-panel__title) {
    color: var(--text_primary, #1a1a1a);
}
:deep(.agent-panel__action-btn) {
    border-color: var(--border_divider);
    color: var(--text_secondary);
}
:deep(.agent-panel__action-btn:hover) {
    background: var(--bg_hover);
    color: var(--text_primary);
}
:deep(.agent-panel__action-btn--cancel) {
    border-color: rgba(220, 38, 38, 0.3);
    color: #dc2626;
}
:deep(.agent-panel__action-btn--cancel:hover) {
    background: rgba(220, 38, 38, 0.05);
}
:deep(.agent-panel__close) {
    color: var(--text_tertiary, #999);
}
:deep(.agent-panel__close:hover) {
    background: var(--bg_hover);
    color: var(--text_primary);
}
:deep(.agent-panel__question) {
    background: var(--bg_brand_contain, rgba(37, 99, 244, 0.04));
    border-bottom: 1px solid var(--border_divider);
}
:deep(.agent-panel__question-label) {
    color: var(--text_brand, #2563f4);
    background: rgba(37, 99, 244, 0.1);
}
:deep(.agent-panel__question-text) {
    color: var(--text_primary);
}
:deep(.agent-panel__body) {
    scrollbar-color: var(--border_divider, #e0e0e2) transparent;
}
:deep(.agent-panel__body::-webkit-scrollbar-thumb) {
    background: var(--border_divider, #e0e0e2);
}
:deep(.agent-panel__body::-webkit-scrollbar-thumb:hover) {
    background: var(--text_tertiary, #999);
}
:deep(.agent-panel__status) {
    color: var(--text_tertiary, #999);
}
:deep(.agent-panel__error) {
    background: rgba(220, 38, 38, 0.05);
    border-color: rgba(220, 38, 38, 0.2);
    color: #dc2626;
}
:deep(.agent-panel__spinner) {
    border-color: var(--border_divider, #e0e0e2);
    border-top-color: var(--text_brand, #2563f4);
}
</style>
