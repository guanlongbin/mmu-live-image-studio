import js from '@eslint/js';
import globals from 'globals';

/**
 * upload-tool 仅运行在 Node.js，使用独立配置避免继承业务应用的浏览器/Vue 环境。
 */
export default [
    { ignores: ['node_modules/'] },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
    },
];
