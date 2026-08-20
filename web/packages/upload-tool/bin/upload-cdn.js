#!/usr/bin/env node
/**
 * ks-upload-cdn CLI
 *
 * 从项目根目录的环境变量或 rsbuild 配置中读取 CDN 配置，上传 dist/static 到 KCDN。
 *
 * 环境变量：
 *   KCDN_TOKEN      KCDN 鉴权 token（必填，或在 rsbuild.config.js 中导出 CDN_TOKEN）
 *   KCDN_PID        KCDN 项目 ID，默认 'data-agent-smart-site'
 *   KCDN_DIR        CDN 目标目录，默认 'data-agent-website-build-file/static'
 *   KCDN_UID        上传者账号，默认 'zhangxin10'
 *   KCDN_DIST_DIR   本地 dist 目录路径，默认 '<cwd>/dist/static'
 *   KCDN_WEBLOG_PRODUCT_NAME Weblog 产品名，默认 'DataAgentTemplate'
 */

import path from 'node:path';
import { uploadWithRetry } from '../index.js';

const cwd = process.cwd();

// 尝试从 rsbuild.config.js 读取 CDN_TOKEN（向后兼容旧模板）
let CDN_TOKEN_FROM_CONFIG;
try {
    const config = await import(path.join(cwd, 'rsbuild.config.js'));
    CDN_TOKEN_FROM_CONFIG = config.CDN_TOKEN;
} catch {
    // rsbuild.config.js 不存在或不导出 CDN_TOKEN，忽略
}

const TOKEN = process.env.KCDN_TOKEN || CDN_TOKEN_FROM_CONFIG;

const PID = process.env.KCDN_PID || 'data-agent-smart-site';
const CDN_DIR = process.env.KCDN_DIR || 'data-agent-website-build-file/static';
const UID = process.env.KCDN_UID || 'zhangxin10';
const DIST_DIR = process.env.KCDN_DIST_DIR || path.join(cwd, 'dist/static');

async function main() {
    console.log(`📦 开始上传 ${DIST_DIR} 到 KCDN ...`);
    const cdnUrls = await uploadWithRetry({
        pid: PID,
        token: TOKEN,
        cdnDir: CDN_DIR,
        files: [DIST_DIR],
        uid: UID,
        allowRewrite: 'true',
        allowHash: 'false',
    });
    console.log('✅ CDN 上传完成。index.html 已引用 CDN 远程资源，部署该文件即可。');
    console.log('上传文件列表：', cdnUrls);
}

main().catch((err) => {
    console.error('❌ CDN 上传失败：', err?.message || err);
    // 此时 uploadWithRetry 已等待全部上报完成或超时，可以安全结束 CLI，避免残留网络句柄挂住流水线。
    process.exit(1);
});
