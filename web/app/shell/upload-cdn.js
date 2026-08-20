/**
 * 构建产物上传 KCDN
 *
 * 由 `pnpm build`（rsbuild build && ks-upload-cdn）自动调用。
 * 上传逻辑已封装在 @ks-data/upload-tool，此处只配置本项目的 CDN 参数。
 *
 * 推荐通过 package.json scripts 中的 `ks-upload-cdn` CLI 直接调用（已在 build 命令中配置），
 * 保留此文件用于自定义上传场景（如需指定特殊路径或参数）。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uploadWithRetry } from '@ks-data/upload-tool';
import { CDN_TOKEN } from '../rsbuild.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = CDN_TOKEN || process.env.KCDN_TOKEN || '113209_653e9c02cc12dd5fa803115e814796b6';

const uploadOptions = {
    pid: 'data-agent-smart-site',
    token: TOKEN,
    cdnDir: 'data-agent-website-build-file/static',
    files: [path.join(__dirname, '../dist/static')],
    uid: 'zhangxin10',
    allowRewrite: 'true',
    allowHash: 'false',
};

uploadWithRetry(uploadOptions)
    .then((cdnUrls) => {
        console.log('✅ CDN 上传完成。index.html 已引用 CDN 远程资源，部署该文件即可。');
        console.log('上传文件列表：', cdnUrls);
    })
    .catch((err) => {
        console.error('❌ CDN 上传失败：', err?.message || err);
        // upload-tool 已等待全部上报完成或超时，此处退出不会再截断上报队列。
        process.exit(1);
    });
