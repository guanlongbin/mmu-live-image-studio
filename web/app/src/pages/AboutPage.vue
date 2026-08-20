<!-- 关于页：项目说明，使用 @headlessui/vue Disclosure 折叠面板 -->
<template>
    <div class="tw-min-h-screen tw-bg-[var(--bg_layout)] tw-text-[var(--text_primary)] tw-py-12 tw-px-6 tw-flex tw-justify-center tw-transition-colors tw-duration-400">
        <div class="tw-w-full tw-max-w-[720px] tw-flex tw-flex-col tw-gap-5">
            <!-- 顶部返回 & 标题 -->
            <header class="tw-flex tw-items-center tw-gap-3 tw-mb-1">
                <RouterLink
                    to="/"
                    class="tw-inline-flex tw-items-center tw-justify-center tw-w-9 tw-h-9 tw-rounded-[10px] tw-bg-[var(--bg_contain)] tw-border tw-border-[1.5px] tw-border-[var(--border_divider)] tw-text-[var(--text_secondary)] tw-no-underline tw-flex-shrink-0 tw-transition-colors tw-duration-200 hover:tw-bg-[var(--bg_hover)] hover:tw-text-[var(--text_primary)]"
                    aria-label="返回首页"
                >
                    <ArrowLeftIcon class="tw-w-4 tw-h-4" />
                </RouterLink>
                <div>
                    <h1 class="tw-text-[22px] tw-font-bold tw-m-0 tw-leading-[1.3] tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">关于 DataAgent</h1>
                    <p class="tw-text-[13px] tw-text-[var(--text_tertiary)] tw-mt-1 tw-mb-0 tw-transition-colors tw-duration-400">最小前端模板说明</p>
                </div>
            </header>

            <!-- 项目简介卡片 -->
            <section class="tw-flex tw-items-start tw-gap-4 tw-rounded-2xl tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-p-6 tw-transition-colors tw-duration-400">
                <div class="tw-flex tw-items-center tw-justify-center tw-w-11 tw-h-11 tw-rounded-xl tw-flex-shrink-0" style="background: linear-gradient(135deg, #6366f1, #22d3ee)">
                    <CubeTransparentIcon class="tw-w-[22px] tw-h-[22px] tw-text-white" />
                </div>
                <div class="tw-flex-1 tw-min-w-0">
                    <h2 class="tw-text-[15px] tw-font-semibold tw-m-0 tw-mb-1.5 tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">技术栈</h2>
                    <p class="tw-text-[13px] tw-leading-[1.65] tw-text-[var(--text_secondary)] tw-m-0 tw-transition-colors tw-duration-400">
                        最小前端模板：<span class="tw-text-[var(--text_brand)] tw-font-medium">Rsbuild + Vue 3 + vue-router</span>，
                        演示「身份认证 → 调用业务接口」完整链路，并集成
                        <span class="tw-text-[var(--text_brand)] tw-font-medium">Headless UI</span> +
                        <span class="tw-text-[var(--text_brand)] tw-font-medium">Tailwind CSS</span> 样式体系。
                    </p>
                </div>
            </section>

            <!-- 目录结构 — Disclosure 折叠面板 -->
            <section class="tw-flex tw-flex-col tw-gap-2">
                <Disclosure
                    v-for="section in sections"
                    :key="section.title"
                    v-slot="{ open }"
                    as="div"
                    class="tw-rounded-xl tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-overflow-hidden tw-transition-colors tw-duration-400"
                >
                    <DisclosureButton class="tw-w-full tw-flex tw-items-center tw-justify-between tw-px-[18px] tw-py-3.5 tw-text-left tw-bg-transparent tw-border-none tw-cursor-pointer tw-transition-colors tw-duration-150 hover:tw-bg-[var(--bg_hover)] focus:tw-outline-none">
                        <div class="tw-flex tw-items-center tw-gap-2.5">
                            <component :is="section.icon" class="tw-w-4 tw-h-4 tw-flex-shrink-0 tw-text-[var(--text_brand)]" />
                            <span class="tw-text-sm tw-font-medium tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">{{ section.title }}</span>
                        </div>
                        <ChevronDownIcon
                            :class="['tw-w-4 tw-h-4 tw-text-[var(--text_tertiary)] tw-transition-[transform,color] tw-duration-200', open && 'tw-rotate-180']"
                        />
                    </DisclosureButton>

                    <DisclosurePanel class="tw-px-[18px] tw-pb-3.5">
                        <ul class="tw-list-none tw-m-0 tw-p-0 tw-flex tw-flex-col tw-gap-2">
                            <li v-for="item in section.items" :key="item.path" class="tw-flex tw-items-start tw-gap-2 tw-text-[13px]">
                                <code class="tw-flex-shrink-0 tw-text-xs tw-font-['SF_Mono','Fira_Code',monospace] tw-text-[var(--text_brand)] tw-bg-[var(--bg_brand_contain)] tw-px-[7px] tw-py-0.5 tw-rounded tw-transition-colors tw-duration-400">{{ item.path }}</code>
                                <span class="tw-text-[13px] tw-leading-[1.5] tw-text-[var(--text_secondary)] tw-transition-colors tw-duration-400">{{ item.desc }}</span>
                            </li>
                        </ul>
                    </DisclosurePanel>
                </Disclosure>
            </section>

            <!-- 新增页面指引 -->
            <section class="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-bg-[var(--bg_warning_notice)] tw-border tw-border-[var(--bg_warning_tag)] tw-px-6 tw-py-5 tw-transition-colors tw-duration-400">
                <LightBulbIcon class="tw-w-5 tw-h-5 tw-flex-shrink-0 tw-mt-0.5 tw-text-[var(--text_warning)]" />
                <div class="tw-flex-1 tw-min-w-0">
                    <h3 class="tw-text-sm tw-font-semibold tw-m-0 tw-mb-2 tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">如何新增页面？</h3>
                    <ol class="tw-list-decimal tw-pl-5 tw-m-0 tw-flex tw-flex-col tw-gap-1.5">
                        <li class="tw-text-[13px] tw-text-[var(--text_secondary)] tw-transition-colors tw-duration-400">在 <code class="tw-text-xs tw-font-['SF_Mono','Fira_Code',monospace] tw-text-[var(--text_brand)] tw-bg-[var(--bg_brand_contain)] tw-px-[7px] tw-py-0.5 tw-rounded">src/pages/</code> 下新建 Vue 组件</li>
                        <li class="tw-text-[13px] tw-text-[var(--text_secondary)] tw-transition-colors tw-duration-400">在 <code class="tw-text-xs tw-font-['SF_Mono','Fira_Code',monospace] tw-text-[var(--text_brand)] tw-bg-[var(--bg_brand_contain)] tw-px-[7px] tw-py-0.5 tw-rounded">src/router/index.ts</code> 注册路由</li>
                        <li class="tw-text-[13px] tw-text-[var(--text_secondary)] tw-transition-colors tw-duration-400">用 <code class="tw-text-xs tw-font-['SF_Mono','Fira_Code',monospace] tw-text-[var(--text_brand)] tw-bg-[var(--bg_brand_contain)] tw-px-[7px] tw-py-0.5 tw-rounded">RouterLink</code> 或 <code class="tw-text-xs tw-font-['SF_Mono','Fira_Code',monospace] tw-text-[var(--text_brand)] tw-bg-[var(--bg_brand_contain)] tw-px-[7px] tw-py-0.5 tw-rounded">useRouter</code> 跳转即可</li>
                    </ol>
                </div>
            </section>

            <!-- 依赖说明 -->
            <section class="tw-rounded-2xl tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-p-6 tw-transition-colors tw-duration-400">
                <h3 class="tw-flex tw-items-center tw-gap-2 tw-text-[15px] tw-font-semibold tw-m-0 tw-mb-4 tw-text-[var(--text_primary)] tw-transition-colors tw-duration-400">
                    <PuzzlePieceIcon class="tw-w-4 tw-h-4 tw-text-[var(--text_brand)]" />
                    集成说明
                </h3>
                <div class="tw-grid tw-grid-cols-2 tw-gap-3 max-sm:tw-grid-cols-1">
                    <article
                        v-for="pkg in packages"
                        :key="pkg.name"
                        class="tw-flex tw-flex-col tw-gap-2 tw-p-4 tw-rounded-xl tw-bg-[var(--bg_contain)] tw-border tw-border-[var(--border_divider)] tw-transition-colors tw-duration-400"
                    >
                        <h4 class="tw-text-[13px] tw-font-semibold tw-m-0 tw-text-[var(--text_brand)] tw-font-['SF_Mono','Fira_Code',monospace] tw-transition-colors tw-duration-400">{{ pkg.name }}</h4>
                        <p class="tw-text-xs tw-leading-[1.55] tw-text-[var(--text_secondary)] tw-m-0 tw-transition-colors tw-duration-400">{{ pkg.desc }}</p>
                        <pre class="tw-bg-[var(--bg_component)] tw-border tw-border-[var(--border_divider)] tw-rounded-lg tw-px-3 tw-py-2.5 tw-text-[11px] tw-leading-[1.5] tw-text-[var(--text_primary)] tw-font-['SF_Mono','Fira_Code',monospace] tw-overflow-x-auto tw-m-0 tw-whitespace-pre tw-transition-colors tw-duration-400">{{ pkg.usage }}</pre>
                    </article>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
} from '@headlessui/vue';
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    CubeTransparentIcon,
    FolderIcon,
    WrenchScrewdriverIcon,
    CircleStackIcon,
    LightBulbIcon,
    PuzzlePieceIcon,
} from '@heroicons/vue/24/outline';

const sections = [
    {
        title: 'src/pages/ — 路由页面',
        icon: FolderIcon,
        items: [
            { path: 'HomePage.vue', desc: '欢迎页，展示用户信息与 DataAgent 功能介绍' },
            { path: 'AboutPage.vue', desc: '本页面，项目结构与使用说明' },
        ],
    },
    {
        title: 'src/components/ — 可复用组件',
        icon: CubeTransparentIcon,
        items: [{ path: 'UserAvatar.vue', desc: '用户头像组件，自动降级展示首字母' }],
    },
    {
        title: 'src/composables/ — 组合式函数',
        icon: WrenchScrewdriverIcon,
        items: [{ path: 'useCurrentUser.ts', desc: '用户身份共享状态，单例模式，全局只请求一次' }],
    },
    {
        title: 'src/services/ — 接口请求与鉴权',
        icon: CircleStackIcon,
        items: [
            { path: 'api.ts', desc: '业务接口（getQueryMeta 等）封装' },
            { path: 'auth.ts', desc: 'SSO 鉴权逻辑，未登录时跳转企业 SSO' },
        ],
    },
];

const packages = [
    {
        name: '@headlessui/vue',
        desc: '完全无样式、无障碍的 UI 组件库，与 Tailwind CSS 完美配合，提供 Menu、Disclosure、Tab 等组件。',
        usage: `import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'`,
    },
    {
        name: 'Tailwind CSS',
        desc: '原子化 CSS 框架，所有工具类加 tw- 前缀，无需担心样式污染。',
        usage: `// tailwind.config.cjs\nmodule.exports = {\n  prefix: 'tw-',\n  content: ['./src/**/*.{vue,ts,tsx,js,jsx}', './public/index.html'],\n}`,
    },
];
</script>

