/**
 * 业务接口层
 *
 * 通用能力（request / withBase / getAccount / getAuth）已迁移到 @ks-data/utils，
 * 此文件只保留本站点专属的业务接口。
 *
 * 注意：全局 Toast 通知已在 src/index.ts 入口通过 setGlobalNotify 统一注入，
 * 无需在此重复配置。
 */
import { request } from '@ks-data/utils';

// 通用能力重新导出，方便现有调用方无缝迁移
export { request } from '@ks-data/utils';

/**
 * 简单业务接口：获取某个智能应用的「猜你想问」问题。
 * 对应 data-agent: GET /rest/flow/api/v1/agents/getQueryMeta
 * 必传参数 id = 智能应用 id（426 为「磁力番薯」，可改成自己有权限的 agent id）。
 */
export function getQueryMeta(id: number | string = 426) {
    return request('/rest/flow/api/v1/agents/getQueryMeta', { method: 'GET', params: { id } });
}
