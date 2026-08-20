<template>
    <main class="studio-shell">
        <header class="topbar">
            <div>
                <p class="eyebrow">MMU / IMAGE TOOL</p>
                <h1>MMU Live Image Studio</h1>
            </div>
            <span class="security-note">会话级密钥 · 不保存</span>
        </header>

        <section class="workspace" data-module-id="image-generator-workbench">
            <aside class="config-panel">
                <div class="section-heading">
                    <h2>生成配置</h2>
                    <p>服务地址和密钥仅用于本次浏览器会话。</p>
                </div>

                <label class="field-label" for="base-url">服务地址</label>
                <div class="url-presets">
                    <button type="button" class="text-button" @click="baseUrl = officeUrl">办公网</button>
                    <button type="button" class="text-button" @click="baseUrl = idcUrl">IDC</button>
                </div>
                <input id="base-url" v-model.trim="baseUrl" class="field-input" type="url" autocomplete="off" />

                <label class="field-label" for="api-key">API Key</label>
                <input
                    id="api-key"
                    v-model="apiKey"
                    class="field-input"
                    type="password"
                    autocomplete="off"
                    placeholder="输入 Coding Plan API Key"
                />

                <label class="field-label" for="model">图片模型</label>
                <select id="model" v-model="model" class="field-input">
                    <option v-for="item in models" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
                <p class="field-hint">{{ currentModel.protocol }}</p>

                <label class="field-label" for="prompt">提示词</label>
                <textarea
                    id="prompt"
                    v-model.trim="prompt"
                    class="field-input prompt-input"
                    rows="6"
                    placeholder="描述想生成的画面、主体、风格、光线和构图"
                ></textarea>

                <div class="parameter-grid">
                    <div>
                        <label class="field-label" for="size">尺寸</label>
                        <select id="size" v-model="size" class="field-input">
                            <option value="1024x1024">1024 × 1024</option>
                            <option value="1536x1024">1536 × 1024</option>
                            <option value="1024x1536">1024 × 1536</option>
                        </select>
                    </div>
                    <div>
                        <label class="field-label" for="count">数量</label>
                        <select id="count" v-model.number="count" class="field-input" :disabled="isGemini">
                            <option :value="1">1 张</option>
                            <option :value="2">2 张</option>
                            <option :value="3">3 张</option>
                            <option :value="4">4 张</option>
                        </select>
                    </div>
                </div>

                <label class="field-label" for="references">参考图片</label>
                <label class="upload-zone" for="references">
                    <span>选择图片</span>
                    <small>支持单图编辑或多图参考融合</small>
                    <input id="references" type="file" accept="image/*" multiple @change="onFilesChange" />
                </label>
                <div v-if="referencePreviews.length" class="reference-list">
                    <figure v-for="image in referencePreviews" :key="image.id" class="reference-item">
                        <img :src="image.dataUrl" alt="参考图片预览" />
                        <button type="button" :aria-label="`删除参考图片 ${image.name}`" @click="removeReference(image.id)">×</button>
                    </figure>
                </div>

                <p v-if="error" class="error-message" role="alert">{{ error }}</p>
                <button class="generate-button" type="button" :disabled="!canGenerate || generating" @click="handleGenerate">
                    <span v-if="generating" class="spinner" aria-hidden="true"></span>
                    {{ generating ? '正在生成图片…' : '生成图片' }}
                </button>
            </aside>

            <section class="result-panel" data-module-id="image-generation-results">
                <div class="result-header">
                    <div>
                        <h2>生成结果</h2>
                        <p>{{ generating ? '正在请求模型，通常需要几十秒。' : resultDescription }}</p>
                    </div>
                    <button v-if="generatedImages.length" type="button" class="text-button" @click="clearResults">清空结果</button>
                </div>

                <div v-if="generating" class="result-state" aria-live="polite">
                    <span class="result-spinner"></span>
                    <strong>正在生成图片</strong>
                    <p>请保持本页打开，完成后将直接显示在这里。</p>
                </div>
                <div v-else-if="!generatedImages.length" class="result-state">
                    <strong>从一个想法开始</strong>
                    <p>填写提示词，选择模型后即可生成图片；也可上传参考图来控制构图和风格。</p>
                </div>
                <div v-else class="image-grid">
                    <article v-for="(image, index) in generatedImages" :key="image.id" class="image-card">
                        <img :src="image.dataUrl" :alt="`生成结果 ${index + 1}`" @click="previewImage = image.dataUrl" />
                        <footer>
                            <span>结果 {{ index + 1 }}</span>
                            <a :href="image.dataUrl" :download="`mmu-image-${index + 1}.png`">下载</a>
                        </footer>
                    </article>
                </div>
            </section>
        </section>

        <div v-if="previewImage" class="preview-overlay" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="previewImage = ''">
            <button type="button" class="close-button" aria-label="关闭图片预览" @click="previewImage = ''">×</button>
            <img :src="previewImage" alt="生成图片大图预览" />
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { generateImage, type GeneratedImage, type ImageModelId, type ReferenceImageInput } from '@/services/api';

const officeUrl = 'https://tokenverse.corp.kuaishou.com/v1beta';
const idcUrl = 'http://tokenverse.internal/v1beta';
const baseUrl = ref(officeUrl);
const apiKey = ref('');
const prompt = ref('');
const model = ref<ImageModelId>('gemini-3-1-flash-lite-image');
const size = ref('1024x1024');
const count = ref(1);
const generating = ref(false);
const error = ref('');
const generatedImages = ref<GeneratedImage[]>([]);
const previewImage = ref('');
const referencePreviews = ref<Array<ReferenceImageInput & { id: string; dataUrl: string; name: string }>>([]);

const models = [
    { id: 'gemini-3-1-flash-lite-image' as const, name: 'Nano Banana 2 Lite', protocol: 'Gemini 原生 · /v1beta generateContent' },
    { id: 'gemini-3-1-flash-image' as const, name: 'Nano Banana 2', protocol: 'Gemini 原生 · /v1beta generateContent' },
    { id: 'gpt-image-2' as const, name: 'GPT-Image-2', protocol: 'OpenAI Images · /v1 images generations' },
];

const currentModel = computed(() => models.find((item) => item.id === model.value) ?? models[0]);
const isGemini = computed(() => model.value.startsWith('gemini-'));
const protocolBaseUrl = computed(() => baseUrl.value);
const canGenerate = computed(() => Boolean(apiKey.value.trim() && protocolBaseUrl.value.trim() && prompt.value.trim()));
watch(isGemini, (gemini) => {
    baseUrl.value = gemini ? officeUrl : 'https://tokenverse.corp.kuaishou.com/v1';
});
const resultDescription = computed(() => generatedImages.value.length ? `已生成 ${generatedImages.value.length} 张图片。` : '生成完成后，图片会显示在这里。');

function fileToReference(file: File) {
    return new Promise<ReferenceImageInput & { id: string; dataUrl: string; name: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            const base64 = dataUrl.split(',')[1];
            if (!base64) {
                reject(new Error('图片读取失败，请重新选择。'));
                return;
            }
            resolve({ id: crypto.randomUUID(), name: file.name, mimeType: file.type || 'image/png', base64, dataUrl });
        };
        reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'));
        reader.readAsDataURL(file);
    });
}

async function onFilesChange(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    error.value = '';
    try {
        referencePreviews.value = await Promise.all(files.map(fileToReference));
    } catch (fileError: any) {
        error.value = fileError?.message || '参考图处理失败，请重新选择。';
    }
}

function removeReference(id: string) {
    referencePreviews.value = referencePreviews.value.filter((item) => item.id !== id);
}

function clearResults() {
    generatedImages.value = [];
    previewImage.value = '';
}

async function handleGenerate() {
    if (!canGenerate.value || generating.value) return;
    error.value = '';
    generating.value = true;
    try {
        generatedImages.value = await generateImage({
            apiKey: apiKey.value,
            baseUrl: baseUrl.value,
            model: model.value,
            prompt: prompt.value,
            size: size.value,
            count: count.value,
            referenceImages: referencePreviews.value.map(({ mimeType, base64 }) => ({ mimeType, base64 })),
        });
    } catch (requestError: any) {
        error.value = requestError?.message || '无法生成图片，请检查服务地址、API Key 与模型权限后重试。';
    } finally {
        generating.value = false;
    }
}
</script>

<style scoped>
.studio-shell { min-height: 100vh; background: var(--bg_contain); color: var(--text_primary); padding: 28px; }
.topbar { display: flex; align-items: flex-start; justify-content: space-between; max-width: 1440px; margin: 0 auto 20px; }
.eyebrow { margin: 0 0 6px; color: var(--text_brand); font-size: 11px; font-weight: 700; letter-spacing: .12em; }
h1, h2, p { margin-top: 0; } h1 { margin-bottom: 0; font-size: 24px; line-height: 1.25; letter-spacing: -.02em; } h2 { margin-bottom: 6px; font-size: 16px; } p { color: var(--text_secondary); font-size: 13px; line-height: 1.65; }
.security-note { border: 1px solid var(--border_divider); border-radius: 999px; padding: 5px 10px; color: var(--text_secondary); font-size: 12px; background: var(--bg_component); }
.workspace { display: grid; grid-template-columns: minmax(320px, 400px) minmax(0, 1fr); gap: 20px; max-width: 1440px; margin: 0 auto; }
.config-panel, .result-panel { border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_component); }
.config-panel { padding: 20px; } .section-heading { margin-bottom: 18px; }.section-heading p { margin-bottom: 0; }
.field-label { display: block; margin: 16px 0 6px; color: var(--text_secondary); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.field-input { width: 100%; border: 1px solid var(--border_form); border-radius: 6px; padding: 9px 10px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
.field-input:focus { border-color: var(--border_brand); box-shadow: 0 0 0 2px var(--bg_brand_tag); }.field-input:disabled { cursor: not-allowed; opacity: .55; }.prompt-input { resize: vertical; min-height: 130px; }.field-hint { margin: 6px 0 0; color: var(--text_tertiary); font-size: 12px; }.url-presets { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: -22px; }.text-button { border: 0; padding: 0; background: none; color: var(--text_brand); font: inherit; font-size: 12px; cursor: pointer; }.text-button:hover { text-decoration: underline; }.text-button:focus-visible, .generate-button:focus-visible, .close-button:focus-visible, .reference-item button:focus-visible { outline: 2px solid var(--border_brand); outline-offset: 2px; }
.parameter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.upload-zone { display: flex; min-height: 90px; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1px dashed var(--border_form); border-radius: 6px; color: var(--text_brand); cursor: pointer; font-size: 13px; }.upload-zone:hover { border-color: var(--border_brand); background: var(--bg_brand_contain); }.upload-zone small { color: var(--text_tertiary); }.upload-zone input { display: none; }.reference-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }.reference-item { position: relative; width: 64px; height: 64px; margin: 0; overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; }.reference-item img { width: 100%; height: 100%; object-fit: cover; }.reference-item button { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border: 0; border-radius: 50%; background: var(--bg_component); color: var(--text_primary); cursor: pointer; }.error-message { margin: 14px 0 0; color: var(--text_negative); font-size: 12px; }.generate-button { width: 100%; min-height: 40px; margin-top: 18px; border: 0; border-radius: 6px; background: var(--text_brand); color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; transition: opacity .15s, transform .15s; }.generate-button:hover { opacity: .9; }.generate-button:active { transform: scale(.98); }.generate-button:disabled { cursor: not-allowed; opacity: .45; }.spinner, .result-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; vertical-align: -2px; }.spinner { margin-right: 7px; }
.result-panel { min-height: 680px; padding: 20px; }.result-header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid var(--border_divider); }.result-header p { margin-bottom: 0; }.result-state { display: flex; min-height: 560px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }.result-state strong { font-size: 15px; }.result-state p { max-width: 360px; margin: 8px 0 0; }.result-spinner { width: 22px; height: 22px; margin-bottom: 12px; color: var(--text_brand); }.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; padding-top: 18px; }.image-card { overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_layout); }.image-card img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; cursor: zoom-in; }.image-card footer { display: flex; justify-content: space-between; padding: 10px; color: var(--text_secondary); font-size: 12px; }.image-card a { color: var(--text_brand); text-decoration: none; }.image-card a:hover { text-decoration: underline; }.preview-overlay { position: fixed; z-index: 400; inset: 0; display: flex; align-items: center; justify-content: center; padding: 36px; background: rgba(0, 0, 0, .75); }.preview-overlay img { max-width: 100%; max-height: 100%; object-fit: contain; }.close-button { position: fixed; top: 16px; right: 18px; width: 38px; height: 38px; border: 0; border-radius: 6px; background: var(--bg_component); color: var(--text_primary); cursor: pointer; font-size: 24px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 860px) { .studio-shell { padding: 16px; }.topbar { gap: 12px; }.workspace { grid-template-columns: 1fr; }.result-panel { min-height: 480px; }.result-state { min-height: 360px; } }
</style>
