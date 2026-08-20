/**
 * @ks-data/data-agent - useDataAgent composable
 *
 * 封装 @ks-data/data-agent-sdk（独立模式）的初始化、发送、流式状态管理。
 *
 * 使用方式：
 * ```ts
 * const { analyze, isStreaming, isReady, processItems, error } = useDataAgent({
 *   agentId: 426,
 * });
 * // 点击按钮时
 * await analyze('帮我分析昨天的销售数据');
 * ```
 */
import { ref, computed, onUnmounted, shallowRef } from 'vue';
import { createAgentSDK } from '@ks-data/data-agent-sdk';
import { parseChunks } from '@ks-data/data-agent-sdk/parser';
import type { Chunk } from '@ks-data/data-agent-sdk/parser';

/** 追加到每次 analyze content 末尾的提示词，禁止 SDK 使用特定追问组件 */
export const promptAppendText = '，禁止使用component追问组件和exec-confirm skill';

export interface UseDataAgentOptions {
    /** Agent ID，独立模式必填 */
    agentId: number;
    /** 主题，默认 'light' */
    theme?: 'dark' | 'light';
    /** 自定义获取登录用户信息（可选，不传则 SDK 内部自行获取） */
    getAccount?: () => Promise<any>;
    /** 自定义埋点上报（可选） */
    onLog?: (action: string, params?: Record<string, any>) => void;
}

export function useDataAgent(options: UseDataAgentOptions) {
    const { agentId, getAccount, onLog, theme } = options;

    // ===== 状态 =====
    const isReady = ref(false);
    const isStreaming = ref(false);
    const isCancel = ref(false);
    const error = ref<string | null>(null);
    /** 存储流式 chunks，使用 shallowRef 避免深层响应式开销 */
    const chunks = shallowRef<Chunk[]>([]);

    /** SDK 实例 */
    const sdkRef = shallowRef<any>(null);

    /** 待清理的事件订阅取消函数 */
    const unsubFns: Array<() => void> = [];

    // ===== 初始化 SDK =====
    (() => {
        let apiOrigin = location.origin + window.__APP_BASE__;

        const sdk = createAgentSDK({
            agentId,
            theme: theme || 'light',
            apiOrigin,
            ...(getAccount ? { getAccount } : {}),
            ...(onLog ? { onLog } : {}),
        });
        sdkRef.value = sdk;

        // 绑定事件
        unsubFns.push(
            sdk.messages.on('streaming', (data: any) => {
                chunks.value = [...(data?.content ?? [])];
            }),
            sdk.messages.on('complete', (_data: any) => {
                isStreaming.value = false;
            }),
            sdk.messages.on('error', (data: any) => {
                isStreaming.value = false;
                error.value = data?.message || '分析过程中出现错误，请稍后重试';
            }),
        );

        // 等待核心初始化
        sdk.ready().then(() => {
            isReady.value = true;
        }).catch((e: any) => {
            error.value = `SDK 初始化失败：${e?.message || String(e)}`;
        });
    })();

    // ===== 解析结果（响应式计算） =====
    const parsedResult = computed(() => {
        if (!chunks.value.length) {
            return { executeItems: [], conclusion: '' };
        }
        return parseChunks(chunks.value, {
            isLastChunk: !isStreaming.value,
            splitConclusionAndProcess: false,
            enableStreamFinalize: true,
            isCancel: isCancel.value
        }) as {
            executeItems: any[];
            conclusion: string;
        };
    });

    const processItems = computed(() => parsedResult.value.executeItems ?? []);

    // ===== 对外 API =====
    /**
     * 发起一次 AI 分析请求
     * @param content 发送给 Agent 的消息文本
     * @param extraParams 可选的引用资源（datasets / dashboards / tables 等）
     */
    async function analyze(content: string, extraParams?: Record<string, any>) {
        if (!isReady.value) {
            error.value = 'SDK 尚未初始化完成，请稍后再试';
            return;
        }
        if (isStreaming.value) return;
        error.value = null;
        chunks.value = [];
        isStreaming.value = true;
        isCancel.value = false;
        try {
            await sdkRef.value.messages.send({
                content: content + promptAppendText,
                ...(extraParams ? { extraParams } : {}),
            });
        } catch (e: any) {
            isStreaming.value = false;
            error.value = e?.message || '发送消息失败，请稍后重试';
        }
    }

    /**
     * 取消当前流式请求
     */
    function cancel() {
        sdkRef.value?.messages.cancel();
        isStreaming.value = false;
        isCancel.value = true;
    }

    /**
     * 重置会话（开启新对话）
     */
    function reset() {
        sdkRef.value?.conversations.reset();
        chunks.value = [];
        error.value = null;
        isStreaming.value = false;
    }

    // ===== 生命周期 =====
    onUnmounted(() => {
        unsubFns.forEach(fn => fn());
        unsubFns.length = 0;
    });

    return {
        /** SDK 是否已初始化完成 */
        isReady,
        /** 当前是否正在流式输出 */
        isStreaming,
        /** 错误信息（null 表示无错误） */
        error,
        /** 执行过程步骤列表，传给 ExecuteProcessView */
        processItems,
        /** 发起 AI 分析 */
        analyze,
        /** 取消当前请求 */
        cancel,
        /** 重置会话 */
        reset,
        /** 暴露原始 sdk 实例，供高级用法（如切换模型） */
        sdk: sdkRef,
    };
}
