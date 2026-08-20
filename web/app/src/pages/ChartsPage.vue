<!-- ECharts 演示页：折线图 / 柱状图 / 饼图，支持暗色/亮色主题联动 -->
<template>
    <div class="tw-min-h-screen tw-bg-[var(--bg_layout)] tw-text-[var(--text_primary)] tw-py-12 tw-px-6 tw-flex tw-justify-center tw-transition-colors tw-duration-400">
        <div class="tw-w-full tw-max-w-[960px] tw-flex tw-flex-col tw-gap-5">
            <!-- 顶部导航 -->
            <header class="tw-flex tw-items-center tw-gap-3">
                <RouterLink
                    to="/"
                    class="tw-inline-flex tw-items-center tw-justify-center tw-w-9 tw-h-9 tw-rounded-[10px] tw-bg-[var(--bg_contain)] tw-border tw-border-[1.5px] tw-border-[var(--border_divider)] tw-text-[var(--text_secondary)] tw-no-underline tw-flex-shrink-0 tw-transition-colors tw-duration-200 hover:tw-bg-[var(--bg_hover)] hover:tw-text-[var(--text_primary)]"
                    aria-label="返回首页"
                >
                    <ArrowLeftIcon class="tw-w-4 tw-h-4" />
                </RouterLink>
                <div>
                    <h1 class="tw-text-[22px] tw-font-bold tw-m-0 tw-leading-[1.3] tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">数据可视化 Demo</h1>
                    <p class="tw-text-[13px] tw-text-[var(--text_tertiary)] tw-mt-1 tw-mb-0 tw-transition-colors tw-duration-400">ECharts 6 + 暗色 / 亮色主题联动</p>
                </div>
            </header>

            <!-- 指标卡片行 -->
            <section class="tw-grid tw-grid-cols-4 tw-gap-4 max-md:tw-grid-cols-2">
                <article
                    v-for="m in metrics"
                    :key="m.label"
                    class="tw-flex tw-flex-col tw-gap-1.5 tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-rounded-[14px] tw-px-5 tw-py-[18px] tw-transition-[background,border-color,transform] tw-duration-200 hover:tw-border-[var(--border_brand)] hover:-tw-translate-y-0.5"
                >
                    <div class="tw-text-xs tw-text-[var(--text_tertiary)] tw-transition-colors tw-duration-400">{{ m.label }}</div>
                    <div class="tw-text-[26px] tw-font-bold tw-text-[var(--text_primary)] tw-leading-[1.2] tw-transition-colors tw-duration-400">
                        {{ m.value }}
                        <span class="tw-text-[13px] tw-font-normal tw-text-[var(--text_tertiary)] tw-ml-0.5">{{ m.unit }}</span>
                    </div>
                    <div
                        :class="[
                            'tw-inline-flex tw-items-center tw-gap-[3px] tw-text-xs tw-mt-0.5 tw-font-medium',
                            m.up ? 'tw-text-[var(--text_positive)]' : 'tw-text-[var(--text_negative)]'
                        ]"
                    >
                        <component :is="m.up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon" class="tw-w-3.5 tw-h-3.5" />
                        {{ m.change }}
                    </div>
                </article>
            </section>

            <!-- 图表区域 -->
            <section class="tw-grid tw-grid-cols-2 tw-gap-4 max-md:tw-grid-cols-1">
                <!-- 折线图 -->
                <article class="tw-col-span-2 tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-rounded-[14px] tw-p-5 tw-transition-colors tw-duration-400">
                    <header class="tw-flex tw-items-center tw-gap-2 tw-mb-4">
                        <PresentationChartLineIcon class="tw-w-4 tw-h-4 tw-text-[var(--text_brand)]" />
                        <span class="tw-text-sm tw-font-semibold tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">访问趋势（近 7 天）</span>
                    </header>
                    <div ref="lineRef" class="tw-h-[220px] tw-w-full"></div>
                </article>

                <!-- 柱状图 -->
                <article class="tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-rounded-[14px] tw-p-5 tw-transition-colors tw-duration-400">
                    <header class="tw-flex tw-items-center tw-gap-2 tw-mb-4">
                        <ChartBarIcon class="tw-w-4 tw-h-4 tw-text-[var(--text_brand)]" />
                        <span class="tw-text-sm tw-font-semibold tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">各模块查询量</span>
                    </header>
                    <div ref="barRef" class="tw-h-[260px] tw-w-full"></div>
                </article>

                <!-- 饼图 -->
                <article class="tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-rounded-[14px] tw-p-5 tw-transition-colors tw-duration-400">
                    <header class="tw-flex tw-items-center tw-gap-2 tw-mb-4">
                        <ChartPieIcon class="tw-w-4 tw-h-4 tw-text-[var(--text_brand)]" />
                        <span class="tw-text-sm tw-font-semibold tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">数据源分布</span>
                    </header>
                    <div ref="pieRef" class="tw-h-[260px] tw-w-full"></div>
                </article>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
    ArrowLeftIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    PresentationChartLineIcon,
    ChartBarIcon,
    ChartPieIcon,
} from '@heroicons/vue/24/outline';
import { useEChart } from '@/composables/useEChart';

// ===== 指标卡片数据 =====
const metrics = [
    { label: '今日查询次数', value: '12,847', unit: '次', change: '+18.3%', up: true },
    { label: '活跃数据源', value: '36', unit: '个', change: '+3', up: true },
    { label: '平均响应时长', value: '0.82', unit: 's', change: '-12.1%', up: true },
    { label: '查询失败率', value: '0.4', unit: '%', change: '+0.1%', up: false },
];

// ===== 折线图 =====
const lineRef = ref<HTMLElement | null>(null);
const lineOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['查询次数', 'AI 分析次数'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
        type: 'category',
        data: ['6/17', '6/18', '6/19', '6/20', '6/21', '6/22', '6/23'],
        axisLine: { lineStyle: { color: 'var(--border_divider)' } },
        axisLabel: { color: 'var(--text_tertiary)' },
    },
    yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'var(--border_divider)' } },
        axisLabel: { color: 'var(--text_tertiary)' },
    },
    series: [
        {
            name: '查询次数',
            type: 'line',
            smooth: true,
            data: [8200, 9100, 7800, 11200, 10500, 12100, 12847],
            itemStyle: { color: '#2563F4' },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(37,99,244,0.3)' }, { offset: 1, color: 'rgba(37,99,244,0.02)' }] } },
        },
        {
            name: 'AI 分析次数',
            type: 'line',
            smooth: true,
            data: [3100, 3800, 3200, 4900, 4600, 5400, 5900],
            itemStyle: { color: '#22d3ee' },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(34,211,238,0.25)' }, { offset: 1, color: 'rgba(34,211,238,0.02)' }] } },
        },
    ],
}));
useEChart(lineRef, lineOption);

// ===== 柱状图 =====
const barRef = ref<HTMLElement | null>(null);
const barOption = computed(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 20, top: 20, bottom: 60 },
    xAxis: {
        type: 'category',
        data: ['天策', '数仓', 'MySQL', 'ClickHouse', 'Hive', 'Presto'],
        axisLine: { lineStyle: { color: 'var(--border_divider)' } },
        axisLabel: { color: 'var(--text_tertiary)', rotate: 30 },
    },
    yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'var(--border_divider)' } },
        axisLabel: { color: 'var(--text_tertiary)' },
    },
    series: [
        {
            type: 'bar',
            barMaxWidth: 32,
            data: [4200, 3100, 1800, 1500, 900, 700],
            itemStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{ offset: 0, color: '#4A83F6' }, { offset: 1, color: '#2563F4' }],
                },
                borderRadius: [4, 4, 0, 0],
            },
        },
    ],
}));
useEChart(barRef, barOption);

// ===== 饼图 =====
const pieRef = ref<HTMLElement | null>(null);
const pieOption = computed(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: 'var(--text_secondary)' } },
    series: [
        {
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['38%', '50%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: {
                label: { show: true, fontSize: 13, fontWeight: 'bold' },
                itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
            },
            data: [
                { value: 4200, name: '天策', itemStyle: { color: '#2563F4' } },
                { value: 3100, name: '数仓', itemStyle: { color: '#22d3ee' } },
                { value: 1800, name: 'MySQL', itemStyle: { color: '#a855f7' } },
                { value: 1500, name: 'ClickHouse', itemStyle: { color: '#f472b6' } },
                { value: 900,  name: 'Hive', itemStyle: { color: '#fb923c' } },
                { value: 700,  name: 'Presto', itemStyle: { color: '#4ade80' } },
            ],
        },
    ],
}));
useEChart(pieRef, pieOption);
</script>
