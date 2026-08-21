<!-- 公开案例灵感库：本地索引搜索、筛选、收藏与一键带入创作 -->
<template>
  <main class="case-library" data-module-id="case-inspiration-library">
    <header class="library-header">
      <div>
        <p class="eyebrow">MMU / CASE LIBRARY</p>
        <h1>案例灵感库</h1>
        <p class="header-copy">浏览公开案例中的完整 Prompt 与视觉效果，筛选后可直接带入工作台继续创作。</p>
      </div>
      <nav class="header-actions" aria-label="页面导航">
        <RouterLink class="secondary-action" to="/">返回工作台</RouterLink>
        <a class="secondary-action" :href="sourceRepository" target="_blank" rel="noreferrer">查看来源项目</a>
      </nav>
    </header>

    <section class="library-toolbar" aria-label="案例检索与筛选">
      <label class="search-field">
        <span>搜索案例</span>
        <input v-model.trim="query" type="search" placeholder="名称、Prompt、风格、场景" />
      </label>
      <label class="filter-field">
        <span>分类</span>
        <select v-model="category"><option value="all">全部分类</option><option v-for="item in categories" :key="item" :value="item">{{ categoryLabel(item) }}</option></select>
      </label>
      <label class="filter-field">
        <span>风格</span>
        <select v-model="style"><option value="all">全部风格</option><option v-for="item in styles" :key="item" :value="item">{{ item }}</option></select>
      </label>
      <label class="filter-field">
        <span>场景</span>
        <select v-model="scene"><option value="all">全部场景</option><option v-for="item in scenes" :key="item" :value="item">{{ item }}</option></select>
      </label>
      <label class="favorites-filter"><input v-model="favoritesOnly" type="checkbox" /> 仅看收藏</label>
    </section>

    <section class="library-summary" data-module-id="case-search-results">
      <p>共 <strong>{{ filteredCases.length }}</strong> 个匹配案例，已展示 {{ displayedCases.length }} 个。</p>
      <button v-if="hasActiveFilters" type="button" class="text-action" @click="resetFilters">清除筛选</button>
    </section>

    <section v-if="displayedCases.length" class="case-grid" aria-live="polite">
      <article v-for="item in displayedCases" :key="item.id" class="case-card">
        <button type="button" class="case-image-button" @click="openDetail(item)">
          <img :src="imageUrl(item.image)" :alt="item.imageAlt || item.title" loading="lazy" @error="hideBrokenImage" />
          <span>查看详情</span>
        </button>
        <div class="case-card-content">
          <div class="case-card-topline"><span>{{ categoryLabel(item.category) }}</span><button type="button" class="favorite-toggle" :aria-label="isFavorite(item.id) ? '取消收藏' : '收藏案例'" @click="toggleFavorite(item.id)">{{ isFavorite(item.id) ? '已收藏' : '收藏' }}</button></div>
          <h2>{{ item.title }}</h2>
          <p>{{ item.promptPreview || item.prompt }}</p>
          <div class="tag-list"><span v-for="tag in item.styles.slice(0, 2)" :key="tag">{{ tag }}</span><span v-for="tag in item.scenes.slice(0, 1)" :key="tag">{{ tag }}</span></div>
          <div class="case-actions"><button type="button" class="text-action" @click="copyPrompt(item.prompt)">复制 Prompt</button><button type="button" class="primary-action" @click="useCase(item)">带入创作</button></div>
        </div>
      </article>
    </section>
    <section v-else class="empty-state"><strong>没有找到匹配案例</strong><p>试试缩短关键词，或清除当前筛选条件。</p><button type="button" class="primary-action" @click="resetFilters">查看全部案例</button></section>
    <div v-if="canLoadMore" class="load-more"><button type="button" class="secondary-action" @click="visibleCount += pageSize">加载更多案例</button></div>

    <div v-if="selectedCase" class="detail-mask" role="presentation" @click.self="selectedCase = null">
      <section class="detail-panel" role="dialog" aria-modal="true" :aria-label="selectedCase.title">
        <button type="button" class="close-button" aria-label="关闭详情" @click="selectedCase = null">×</button>
        <div class="detail-visual"><img :src="imageUrl(selectedCase.image)" :alt="selectedCase.imageAlt || selectedCase.title" @error="hideBrokenImage" /></div>
        <div class="detail-content">
          <p class="detail-category">{{ categoryLabel(selectedCase.category) }}</p>
          <h2>{{ selectedCase.title }}</h2>
          <div class="tag-list"><span v-for="tag in [...selectedCase.styles, ...selectedCase.scenes]" :key="tag">{{ tag }}</span></div>
          <label class="prompt-preview"><span>完整 Prompt</span><textarea :value="selectedCase.prompt" readonly rows="12"></textarea></label>
          <div class="detail-actions"><button type="button" class="secondary-action" @click="copyPrompt(selectedCase.prompt)">复制 Prompt</button><a class="secondary-action" :href="selectedCase.githubUrl" target="_blank" rel="noreferrer">原案例</a><button type="button" class="primary-action" @click="useCase(selectedCase)">带入工作台</button></div>
          <p class="attribution">案例数据与图片来源：<a :href="sourceRepository" target="_blank" rel="noreferrer">awesome-gpt-image-2</a>（MIT License）。原作者：<a v-if="selectedCase.sourceUrl" :href="selectedCase.sourceUrl" target="_blank" rel="noreferrer">{{ selectedCase.sourceLabel || '查看来源' }}</a><span v-else>{{ selectedCase.sourceLabel || '未标注' }}</span>。</p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import rawLibrary from '@/data/case-library.json';

type CaseItem = { id: number; title: string; image: string; imageAlt?: string; sourceLabel?: string; sourceUrl?: string; prompt: string; promptPreview?: string; category: string; styles: string[]; scenes: string[]; featured?: boolean; githubUrl: string };
type Library = { repository: string; categories: string[]; styles: string[]; scenes: string[]; cases: CaseItem[] };
const library = rawLibrary as Library;
const router = useRouter();
const sourceRepository = library.repository;
const pageSize = 36;
const query = ref('');
const category = ref('all');
const style = ref('all');
const scene = ref('all');
const favoritesOnly = ref(false);
const visibleCount = ref(pageSize);
const selectedCase = ref<CaseItem | null>();
const favoritesStorageKey = 'mmu-live-image-studio.case-favorites';
const caseDraftStorageKey = 'mmu-live-image-studio.case-draft';
const favoriteIds = ref<number[]>(readFavorites());
const categories = library.categories;
const styles = library.styles;
const scenes = library.scenes;
const categoryNames: Record<string, string> = {
  'Architecture & Spaces': '建筑与空间', 'Brand & Logos': '品牌与标志', 'Characters & People': '人物与角色', 'Charts & Infographics': '图表与信息可视化', 'Documents & Publishing': '文档与出版物', 'History & Classical Themes': '历史与古风题材', 'Illustration & Art': '插画与艺术', 'Other Use Cases': '其他应用场景', 'Photography & Realism': '摄影与写实', 'Posters & Typography': '海报与排版', 'Products & E-commerce': '商品与电商', 'Scenes & Storytelling': '场景与叙事', 'UI & Interfaces': 'UI 与界面',
};
const categoryLabel = (value: string) => categoryNames[value] || value;
const imageUrl = (path: string) => `https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/main/data${path}`;
const normalizedQuery = computed(() => query.value.toLowerCase());
const filteredCases = computed(() => library.cases.filter((item) => {
  const searchable = [item.title, item.prompt, item.category, ...item.styles, ...item.scenes].join(' ').toLowerCase();
  return (!normalizedQuery.value || searchable.includes(normalizedQuery.value))
    && (category.value === 'all' || item.category === category.value)
    && (style.value === 'all' || item.styles.includes(style.value))
    && (scene.value === 'all' || item.scenes.includes(scene.value))
    && (!favoritesOnly.value || isFavorite(item.id));
}));
const displayedCases = computed(() => filteredCases.value.slice(0, visibleCount.value));
const canLoadMore = computed(() => displayedCases.value.length < filteredCases.value.length);
const hasActiveFilters = computed(() => Boolean(query.value) || category.value !== 'all' || style.value !== 'all' || scene.value !== 'all' || favoritesOnly.value);
watch([query, category, style, scene, favoritesOnly], () => { visibleCount.value = pageSize; });
function readFavorites() { try { const stored = JSON.parse(localStorage.getItem(favoritesStorageKey) || '[]'); return Array.isArray(stored) ? stored.filter(Number.isInteger) : []; } catch { return []; } }
function isFavorite(id: number) { return favoriteIds.value.includes(id); }
function toggleFavorite(id: number) { favoriteIds.value = isFavorite(id) ? favoriteIds.value.filter((item) => item !== id) : [...favoriteIds.value, id]; localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds.value)); }
function resetFilters() { query.value = ''; category.value = 'all'; style.value = 'all'; scene.value = 'all'; favoritesOnly.value = false; }
function openDetail(item: CaseItem) { selectedCase.value = item; }
async function copyPrompt(value: string) { try { await navigator.clipboard.writeText(value); } catch { window.prompt('复制以下 Prompt：', value); } }
function useCase(item: CaseItem) { localStorage.setItem(caseDraftStorageKey, JSON.stringify({ prompt: item.prompt, title: item.title, sourceImage: imageUrl(item.image), sourceUrl: item.githubUrl })); router.push('/'); }
function hideBrokenImage(event: Event) { (event.target as HTMLImageElement).style.visibility = 'hidden'; }
</script>

<style scoped>
.case-library{min-height:100vh;background:var(--bg_contain);color:var(--text_primary);padding:28px 36px 48px}.library-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;max-width:1480px;margin:0 auto 22px;border-bottom:1px solid var(--border_divider);padding-bottom:20px}.eyebrow{margin:0 0 6px;color:var(--text_brand);font-size:12px;font-weight:700;letter-spacing:.11em}.library-header h1{margin:0;font-size:28px;letter-spacing:-.04em}.header-copy{max-width:660px;margin:8px 0 0;color:var(--text_secondary);line-height:1.55}.header-actions,.case-actions,.detail-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.secondary-action,.primary-action,.text-action,.favorite-toggle{border:1px solid var(--border_form);background:var(--bg_component);color:var(--text_secondary);border-radius:6px;padding:8px 12px;font:inherit;font-size:13px;text-decoration:none;cursor:pointer}.primary-action{border-color:var(--border_brand);background:var(--text_brand);color:var(--bg_component)}.text-action,.favorite-toggle{border-color:transparent;background:transparent;padding:5px;color:var(--text_brand)}.library-toolbar{max-width:1480px;margin:0 auto;display:grid;grid-template-columns:minmax(260px,2fr) repeat(3,minmax(150px,1fr)) auto;gap:12px;align-items:end;padding:16px;background:var(--bg_component);border:1px solid var(--border_divider);border-radius:8px}.search-field,.filter-field{display:grid;gap:6px;color:var(--text_secondary);font-size:12px}.search-field input,.filter-field select,.prompt-preview textarea{width:100%;box-sizing:border-box;border:1px solid var(--border_form);border-radius:6px;background:var(--bg_component);color:var(--text_primary);padding:9px 10px;font:inherit}.favorites-filter{padding:9px 0;color:var(--text_secondary);font-size:13px;white-space:nowrap}.library-summary{max-width:1480px;margin:16px auto;display:flex;justify-content:space-between;align-items:center;color:var(--text_secondary);font-size:13px}.library-summary p{margin:0}.library-summary strong{color:var(--text_primary)}.case-grid{max-width:1480px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}.case-card{overflow:hidden;background:var(--bg_component);border:1px solid var(--border_divider);border-radius:8px;display:flex;flex-direction:column}.case-image-button{position:relative;display:block;aspect-ratio:4/3;padding:0;border:0;background:var(--bg_hover);cursor:pointer;overflow:hidden}.case-image-button img{width:100%;height:100%;object-fit:cover;transition:transform .2s ease}.case-image-button:hover img{transform:scale(1.025)}.case-image-button span{position:absolute;right:8px;bottom:8px;border-radius:4px;background:var(--bg_floating);color:var(--text_primary);padding:5px 7px;font-size:12px}.case-card-content{padding:13px;display:flex;gap:9px;flex-direction:column;flex:1}.case-card-topline{display:flex;justify-content:space-between;color:var(--text_tertiary);font-size:12px}.case-card h2{font-size:16px;margin:0;line-height:1.35}.case-card p{margin:0;color:var(--text_secondary);font-size:12px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.tag-list{display:flex;gap:6px;flex-wrap:wrap}.tag-list span{border-radius:4px;background:var(--bg_tag);color:var(--text_secondary);padding:3px 6px;font-size:11px}.case-actions{margin-top:auto;justify-content:space-between}.load-more,.empty-state{text-align:center;margin:28px auto}.empty-state{padding:54px 18px;background:var(--bg_component);border:1px dashed var(--border_form);max-width:480px;color:var(--text_secondary)}.empty-state strong{color:var(--text_primary)}.detail-mask{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:var(--bg_mask)}.detail-panel{position:relative;display:grid;grid-template-columns:minmax(280px,1.05fr) minmax(320px,.95fr);max-width:1120px;max-height:calc(100vh - 48px);overflow:auto;background:var(--bg_component);border-radius:8px;border:1px solid var(--border_divider)}.detail-visual{padding:18px;background:var(--bg_contain);display:grid;place-items:center}.detail-visual img{max-width:100%;max-height:calc(100vh - 84px);object-fit:contain}.detail-content{padding:28px;display:flex;flex-direction:column;gap:14px}.detail-content h2{margin:0;font-size:22px}.detail-category{margin:0;color:var(--text_brand);font-size:12px}.prompt-preview{display:grid;gap:7px;color:var(--text_secondary);font-size:12px}.prompt-preview textarea{resize:vertical;line-height:1.55;font-size:12px}.attribution{margin:0;color:var(--text_tertiary);font-size:12px;line-height:1.55}.attribution a{color:var(--text_brand)}.close-button{position:absolute;right:10px;top:8px;z-index:2;border:0;background:var(--bg_component);color:var(--text_primary);font-size:26px;cursor:pointer}@media(max-width:900px){.case-library{padding:20px}.library-header{display:block}.header-actions{margin-top:14px}.library-toolbar{grid-template-columns:1fr 1fr}.search-field{grid-column:1/-1}.detail-panel{grid-template-columns:1fr}.detail-visual img{max-height:50vh}}@media(max-width:560px){.case-library{padding:16px}.library-toolbar{grid-template-columns:1fr}.favorites-filter{padding:0}.case-grid{grid-template-columns:1fr}.library-summary{align-items:flex-start;gap:8px}.detail-mask{padding:10px}.detail-content{padding:20px}}
</style>
