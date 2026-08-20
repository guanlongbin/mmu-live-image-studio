import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import configPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
    { ignores: ['dist/', 'node_modules/'] },

    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/recommended'],

    // .vue 的 <script lang="ts"> 用 TS 解析
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: { parser: tseslint.parser },
        },
    },

    // 业务源码：浏览器环境
    {
        files: ['src/**/*.{ts,vue}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                __DATA_AGENT_ORIGIN__: 'readonly',
            },
        },
    },

    // 构建/脚本：Node 环境
    {
        files: ['*.{js,cjs}', 'shell/**/*.js', 'scripts/**/*.js'],
        languageOptions: { globals: globals.node },
    },

    {
        rules: {
            // 模板里接口返回大量用 any，放开
            '@typescript-eslint/no-explicit-any': 'off',
            // App.vue / 单词组件名不强制
            'vue/multi-word-component-names': 'off',
        },
    },

    // 关闭与 Prettier 冲突的格式化类规则（放最后）
    configPrettier,
);
