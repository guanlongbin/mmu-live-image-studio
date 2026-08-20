/**
 * ECharts 轻量封装 composable
 * - 使用全量 echarts（已含所有图表类型与渲染器，无需手动注册）
 * - 自动 init / dispose，防止内存泄漏
 * - 监听 html[theme] 属性变化，自动重新 init 切换暗色 / 亮色主题
 * - ResizeObserver 自适应容器尺寸
 */
import { onMounted, onUnmounted, watch, type Ref } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export function useEChart(
    containerRef: Ref<HTMLElement | null>,
    option: Ref<EChartsOption>,
) {
    let instance: echarts.ECharts | null = null;
    let activeContainer: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    let mounted = false;

    function isDark() {
        return document.documentElement.getAttribute('theme') === 'dark';
    }

    function disposeInstance() {
        ro?.disconnect();
        ro = null;
        instance?.dispose();
        instance = null;
        activeContainer = null;
    }

    function init(container: HTMLElement) {
        disposeInstance();
        activeContainer = container;
        instance = echarts.init(container, isDark() ? 'dark' : undefined, {
            renderer: 'canvas',
        });
        instance.setOption(option.value);

        ro = new ResizeObserver(resize);
        ro.observe(container);
    }

    function bindContainer(container: HTMLElement | null, force = false) {
        if (!mounted) return;
        if (!container) {
            disposeInstance();
            return;
        }
        if (!force && activeContainer === container && instance) return;
        init(container);
    }

    function resize() {
        instance?.resize();
    }

    // 响应式更新图表配置
    watch(option, (val) => {
        instance?.setOption(val, { notMerge: false });
    }, { deep: true });

    // v-if 可能在组件挂载后才创建图表容器。
    watch(containerRef, (container) => {
        bindContainer(container);
    }, { flush: 'post' });

    onMounted(() => {
        mounted = true;
        bindContainer(containerRef.value);

        // 监听 html[theme] 属性变化，重新 init 切换主题
        mo = new MutationObserver(() => {
            bindContainer(containerRef.value, true);
        });
        mo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['theme'],
        });
    });

    onUnmounted(() => {
        mounted = false;
        disposeInstance();
        mo?.disconnect();
        mo = null;
    });

    return {};
}
