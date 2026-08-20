import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * packages/data-agent 打包配置（rsbuild lib 模式）
 *
 * 目标：把 @ks-data/data-agent-sdk 及其全部 dependencies 打进 bundle，
 * 使 app 安装时只需 1 个包（@ks-data/website-data-agent），而不是 SDK 的 556 个间接依赖。
 *
 * 产物说明：
 *   - dist/index.js         主 bundle（SDK 静态依赖已全部内联，named exports 保留）
 *   - dist/async/           SDK 内部运行时动态加载的重型组件 chunk（mermaid、editor 等）
 *   - dist/static/          图片、字体、SVG 静态资源
 *   - dist/index.css        样式
 *
 * Externalize 规则：
 *   - vue：peerDependency，必须 externalize（避免两份 Vue 实例）
 *   - @yoda/bridge：peerDependency，宿主环境注入，不能内联
 *   - 其余所有依赖：打进 bundle
 */
export default defineConfig({
    plugins: [pluginVue()],

    source: {
        entry: {
            index: resolve(__dirname, 'src/index.ts'),
        },
        tsconfigPath: resolve(__dirname, 'tsconfig.json'),
    },

    output: {
        // ESM 输出：chunkFormat=module，chunkLoading=import
        module: true,
        // 使用相对路径，避免 CSS 里的 font/svg URL 变成绝对路径
        // app 构建时会把 dist/index.css 当作源码处理，绝对路径会导致 Module not found
        assetPrefix: './',
        distPath: {
            root: resolve(__dirname, 'dist'),
            js: '.',
            css: '.',
        },
        filename: {
            js: '[name].js',
            css: '[name].css',
        },
        minify: true,
        sourceMap: false,
        cleanDistPath: true,
    },

    performance: {
        // 同步依赖全部打进主 entry（不拆 vendor chunk）
        // SDK 内部的动态 import() 会保留为 async chunks（运行时按需加载）
        chunkSplit: {
            strategy: 'all-in-one',
        },
    },

    tools: {
        rspack: {
            output: {
                // ESM library：产物以 export { AgentPanel, ... } 形式导出
                library: {
                    type: 'module',
                },
            },
            // externalsType 必须是 'module'，才能在 ESM 产物中用 import ... from '...'
            externalsType: 'module',
            externals: {
                vue: 'vue',
                '@yoda/bridge': '@yoda/bridge',
            },
            optimization: {
                runtimeChunk: false,
                splitChunks: false,
            },
            experiments: {
                // rspack 输出 ESM 需要开启此实验性功能
                outputModule: true,
            },
        },
        // 不生成 HTML 文件
        htmlPlugin: false,
    },
});
