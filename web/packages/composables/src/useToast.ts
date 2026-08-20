/**
 * 全局轻量 Toast 通知系统
 *
 * 用法：
 *   import { useToast } from '@ks-data/composables'
 *   const toast = useToast()
 *   toast.error('接口请求失败：xxx')
 *   toast.success('操作成功')
 *   toast.warn('注意：xxx')
 *   toast.info('提示：xxx')
 */

import { reactive } from 'vue';

export type ToastType = 'error' | 'success' | 'warn' | 'info';

export interface ToastItem {
    id: number;
    type: ToastType;
    message: string;
    duration: number; // ms，0 = 永不自动关闭
}

let _uid = 0;

/** 单例响应式队列，供组件与 composable 共享 */
const toasts = reactive<ToastItem[]>([]);

function add(type: ToastType, message: string, duration = 4000): number {
    const id = ++_uid;
    toasts.push({ id, type, message, duration });
    if (duration > 0) {
        setTimeout(() => remove(id), duration);
    }
    return id;
}

function remove(id: number) {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
}

export function useToast() {
    return {
        /** 响应式 toast 列表，供 ToastContainer 渲染 */
        toasts,
        error:   (msg: string, duration?: number) => add('error',   msg, duration),
        success: (msg: string, duration?: number) => add('success', msg, duration),
        warn:    (msg: string, duration?: number) => add('warn',    msg, duration),
        info:    (msg: string, duration?: number) => add('info',    msg, duration),
        remove,
    };
}
