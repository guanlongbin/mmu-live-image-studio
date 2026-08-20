/**
 * @ks-data/composables 包入口
 *
 * 统一导出所有 Vue Composables 和组件
 */

export { useCurrentUser } from './useCurrentUser';
export { useToast } from './useToast';
export type { ToastType, ToastItem } from './useToast';
export { default as ToastContainer } from './components/ToastContainer.vue';
export { default as KimWithUser } from './components/KimWithUser.vue';

// useInfraUpdate 和 InfraUpdateBanner 将在后续迭代中添加
// export { useInfraUpdate } from './useInfraUpdate';
// export { default as InfraUpdateBanner } from './InfraUpdateBanner.vue';
