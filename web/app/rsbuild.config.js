/**
 * rsbuild 配置 — 项目级薄壳
 *
 * 基建逻辑（端口探测、沙箱 HMR、Cookie 加载等）已封装在 @ks-data/build-preset 中。
 * 此处只配置本项目专属的参数：CDN 路径、代理目标等。
 *
 * ⚠️ 本文件被 git 追踪：以下为本地密钥（登录态 Cookie / KCDN token），
 *    请勿将真实凭证 push 到远端仓库。
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSandboxEnv, createRsbuildConfig } from '@ks-data/build-preset';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_AGENT_ORIGINS = {
    prod: 'https://dataagent.corp.kuaishou.com',
    sgp: 'https://dataagent-sgp.corp.kuaishou.com',
};

const region = process.env.DATA_AGENT_REGION || 'prod';
if (!Object.hasOwn(DATA_AGENT_ORIGINS, region)) {
    throw new Error(`[rsbuild] 无效的 DATA_AGENT_REGION "${region}"，仅支持 prod、sgp`);
}
const dataAgentOrigin = DATA_AGENT_ORIGINS[region];

const sandboxEnv = loadSandboxEnv();
export const CDN_TOKEN = sandboxEnv?.cdn_token;

export default async () =>
    createRsbuildConfig({
        __dirname,
        htmlTitle: 'DataAgent 智能建站',
        proxyTarget: dataAgentOrigin,
        sourceDefines: {
            __DATA_AGENT_ORIGIN__: JSON.stringify(dataAgentOrigin),
        },
    });
