<template>
    <main class="studio-shell">
        <header class="topbar">
            <div>
                <p class="eyebrow">MMU / IMAGE TOOL</p>
                <h1>MMU Live Image Studio</h1>
            </div>
            <span class="security-note">本机浏览器存储 · 不上传</span>
        </header>

        <section class="workspace" data-module-id="image-generator-workbench">
            <aside class="history-panel">
                <div class="history-header">
                    <div><h2>生成历史</h2><p>仅保存在此浏览器</p></div>
                    <button type="button" class="new-session-button" @click="createNewSession">+ 新建</button>
                </div>
                <div v-if="historyLoading" class="history-empty">正在读取本地记录…</div>
                <div v-else-if="!sessions.length" class="history-empty">暂无历史记录<br /><small>生成的图片会默认保留在此设备。</small></div>
                <div v-else class="session-list">
                    <button v-for="session in sessions" :key="session.id" type="button" class="session-item" :class="{ 'session-item--active': session.id === activeSessionId }" @click="loadSession(session)">
                        <span class="session-title">{{ session.title }}</span>
                        <small>{{ formatSessionTime(session.updatedAt) }} · {{ session.images.length }} 张</small>
                    </button>
                </div>
                <div v-if="sessions.length" class="history-footer">
                    <button type="button" class="text-button" @click="deleteCurrentSession">删除当前</button>
                    <button type="button" class="text-button text-button--danger" @click="clearAllSessions">清空全部</button>
                </div>
            </aside>
            <aside class="config-panel">
                <div class="section-heading">
                    <h2>生成配置</h2>
                    <p>密钥、历史和图片仅保存在当前浏览器。</p>
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
                <div class="key-storage-actions">
                    <span>{{ apiKey ? '此设备已自动保存 API Key' : '输入后会自动保存到此设备' }}</span>
                    <button v-if="apiKey" type="button" class="text-button" @click="clearSavedApiKey">清除已保存 Key</button>
                </div>

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
                            <option v-for="preset in sizePresets" :key="preset.value" :value="preset.value">{{ preset.label }}</option>
                            <option value="custom">自定义尺寸</option>
                        </select>
                    </div>
                    <div>
                        <label class="field-label" for="count">数量</label>
                        <select id="count" v-model.number="count" class="field-input">
                            <option :value="1">1 张</option>
                            <option :value="2">2 张（并行生成）</option>
                            <option :value="3">3 张（并行生成）</option>
                            <option :value="4">4 张（并行生成）</option>
                        </select>
                    </div>
                </div>
                <div v-if="size === 'custom'" class="custom-size-row">
                    <div>
                        <label class="field-label" for="custom-width">宽度</label>
                        <input id="custom-width" v-model.number="customWidth" class="field-input" type="number" min="256" max="4096" step="64" />
                    </div>
                    <span class="size-divider">×</span>
                    <div>
                        <label class="field-label" for="custom-height">高度</label>
                        <input id="custom-height" v-model.number="customHeight" class="field-input" type="number" min="256" max="4096" step="64" />
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

                <div v-if="generating" class="progress-box" aria-live="polite">
                    <div class="progress-meta"><span>{{ progressLabel }}</span><strong>{{ progress }}%</strong></div>
                    <div class="progress-track"><span :style="{ width: `${progress}%` }"></span></div>
                    <p>这是请求阶段进度，不代表模型服务端的精确推理百分比。</p>
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
                <div v-else class="image-grid" :class="`image-grid--${Math.min(generatedImages.length, 4)}`">
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
import { computed, onMounted, ref, watch } from 'vue';
import { generateImage, type GeneratedImage, type ImageModelId, type ReferenceImageInput } from '@/services/api';
import { clearSessions, deleteSession, listSessions, saveSession, type ImageGenerationSession } from '@/services/history';

const officeUrl = 'https://tokenverse.corp.kuaishou.com/v1beta';
const idcUrl = 'http://tokenverse.internal/v1beta';
const apiKeyStorageKey = 'mmu-live-image-studio.api-key';
const baseUrl = ref(officeUrl);
const apiKey = ref('');
const prompt = ref('');
const model = ref<ImageModelId>('gemini-3-1-flash-lite-image');
const size = ref('1024x1024');
const customWidth = ref(1024);
const customHeight = ref(1024);
const count = ref(1);
const generating = ref(false);
const progress = ref(0);
const progressLabel = ref('准备请求');
let progressTimer: ReturnType<typeof window.setInterval> | undefined;
const error = ref('');
const generatedImages = ref<GeneratedImage[]>([]);
const sessions = ref<ImageGenerationSession[]>([]);
const activeSessionId = ref(crypto.randomUUID());
const historyLoading = ref(true);
const previewImage = ref('');
const referencePreviews = ref<Array<ReferenceImageInput & { id: string; dataUrl: string; name: string }>>([]);

const sizePresets = [
    { value: '1024x1024', label: '正方形 · 1024 × 1024' },
    { value: '1536x1024', label: '横版 · 1536 × 1024（3:2）' },
    { value: '1024x1536', label: '竖版 · 1024 × 1536（2:3）' },
    { value: '1792x1024', label: '宽屏 · 1792 × 1024（16:9）' },
    { value: '1024x1792', label: '长图 · 1024 × 1792（9:16）' },
    { value: '1024x1365', label: '海报 · 1024 × 1365（3:4）' },
    { value: '1365x1024', label: '横幅 · 1365 × 1024（4:3）' },
];

const models = [
    { id: 'gemini-3-1-flash-lite-image' as const, name: 'Nano Banana 2 Lite', protocol: 'Gemini 原生 · /v1beta generateContent' },
    { id: 'gemini-3-1-flash-image' as const, name: 'Nano Banana 2', protocol: 'Gemini 原生 · /v1beta generateContent' },
    { id: 'gpt-image-2' as const, name: 'GPT-Image-2', protocol: 'OpenAI Images · /v1 images generations' },
];

const currentModel = computed(() => models.find((item) => item.id === model.value) ?? models[0]);
const isGemini = computed(() => model.value.startsWith('gemini-'));
const protocolBaseUrl = computed(() => baseUrl.value);
const resolvedSize = computed(() => size.value === 'custom' ? `${customWidth.value}x${customHeight.value}` : size.value);
const canGenerate = computed(() => Boolean(
    apiKey.value.trim()
    && protocolBaseUrl.value.trim()
    && prompt.value.trim()
    && customWidth.value >= 256
    && customWidth.value <= 4096
    && customHeight.value >= 256
    && customHeight.value <= 4096,
));
watch(isGemini, (gemini) => {
    baseUrl.value = gemini ? officeUrl : 'https://tokenverse.corp.kuaishou.com/v1';
});
watch(apiKey, (value) => {
    if (value.trim()) window.localStorage.setItem(apiKeyStorageKey, value);
    else window.localStorage.removeItem(apiKeyStorageKey);
});
onMounted(async () => {
    apiKey.value = window.localStorage.getItem(apiKeyStorageKey) || '';
    try {
        sessions.value = await listSessions();
    } finally {
        historyLoading.value = false;
    }
});
function clearSavedApiKey() {
    window.localStorage.removeItem(apiKeyStorageKey);
    apiKey.value = '';
}
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

function sessionTitle(value: string) {
    const text = value.trim().replace(/\s+/g, ' ');
    return text.length > 22 ? `${text.slice(0, 22)}…` : text || '未命名生成';
}

function formatSessionTime(timestamp: number) {
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

async function persistCurrentSession() {
    if (!generatedImages.value.length) return;
    const now = Date.now();
    const existing = sessions.value.find((item) => item.id === activeSessionId.value);
    const session: ImageGenerationSession = {
        id: activeSessionId.value,
        title: sessionTitle(prompt.value),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        prompt: prompt.value,
        model: model.value,
        size: resolvedSize.value,
        count: count.value,
        images: generatedImages.value.map(({ id, dataUrl }) => ({ id, dataUrl })),
    };
    await saveSession(JSON.parse(JSON.stringify(session)) as ImageGenerationSession);
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)];
}

function loadSession(session: ImageGenerationSession) {
    activeSessionId.value = session.id;
    prompt.value = session.prompt;
    model.value = session.model;
    if (sizePresets.some((preset) => preset.value === session.size)) {
        size.value = session.size;
    } else {
        const [width, height] = session.size.split('x').map(Number);
        size.value = 'custom';
        customWidth.value = width || 1024;
        customHeight.value = height || 1024;
    }
    count.value = session.count;
    generatedImages.value = session.images;
    previewImage.value = '';
}

function createNewSession() {
    activeSessionId.value = crypto.randomUUID();
    prompt.value = '';
    generatedImages.value = [];
    previewImage.value = '';
    error.value = '';
}

async function deleteCurrentSession() {
    const current = sessions.value.find((item) => item.id === activeSessionId.value);
    if (!current || !window.confirm(`删除“${current.title}”及其中的本地图片吗？`)) return;
    await deleteSession(current.id);
    sessions.value = sessions.value.filter((item) => item.id !== current.id);
    createNewSession();
}

async function clearAllSessions() {
    if (!window.confirm('清空此浏览器中所有生成历史和图片吗？此操作无法恢复。')) return;
    await clearSessions();
    sessions.value = [];
    createNewSession();
}

function clearResults() {
    generatedImages.value = [];
    previewImage.value = '';
}

function startProgress() {
    progress.value = 8;
    progressLabel.value = '正在校验配置';
    progressTimer = window.setInterval(() => {
        if (progress.value < 82) {
            progress.value = Math.min(82, progress.value + Math.max(1, Math.round((82 - progress.value) / 7)));
        }
        progressLabel.value = progress.value < 35 ? '正在建立连接' : progress.value < 68 ? '模型正在生成' : '正在接收图片结果';
    }, 900);
}

function stopProgress(success: boolean) {
    if (progressTimer) window.clearInterval(progressTimer);
    progressTimer = undefined;
    progress.value = success ? 100 : 0;
    progressLabel.value = success ? '图片已生成' : '生成请求未完成';
}

async function handleGenerate() {
    if (!canGenerate.value || generating.value) return;
    error.value = '';
    generating.value = true;
    startProgress();
    try {
        generatedImages.value = await generateImage({
            apiKey: apiKey.value,
            baseUrl: baseUrl.value,
            model: model.value,
            prompt: size.value === 'custom' && isGemini.value
                ? `${prompt.value}\n\n请输出 ${resolvedSize.value} 像素画幅，保持该宽高比。`
                : prompt.value,
            size: resolvedSize.value,
            count: count.value,
            referenceImages: referencePreviews.value.map(({ mimeType, base64 }) => ({ mimeType, base64 })),
        });
        stopProgress(true);
        try {
            await persistCurrentSession();
        } catch (historyError: any) {
            error.value = `图片已生成，但本地历史保存失败：${historyError?.message || '请刷新后重试。'}`;
        }
    } catch (requestError: any) {
        stopProgress(false);
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
.workspace { display: grid; grid-template-columns: minmax(190px, 240px) minmax(320px, 400px) minmax(0, 1fr); gap: 20px; max-width: 1440px; margin: 0 auto; }
.history-panel, .config-panel, .result-panel { border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_component); }
.history-panel { display: flex; min-height: 680px; flex-direction: column; padding: 16px 12px; }.history-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 4px 4px 14px; border-bottom: 1px solid var(--border_divider); }.history-header h2 { margin: 0 0 4px; }.history-header p { margin: 0; color: var(--text_tertiary); font-size: 11px; }.new-session-button { border: 1px solid var(--border_brand); border-radius: 5px; padding: 5px 7px; background: var(--bg_brand_contain); color: var(--text_brand); cursor: pointer; font-size: 11px; font-weight: 700; }.new-session-button:hover { background: var(--text_brand); color: #fff; }.history-empty { padding: 34px 10px; color: var(--text_tertiary); font-size: 12px; line-height: 1.7; text-align: center; }.history-empty small { font-size: 11px; }.session-list { display: flex; flex: 1; flex-direction: column; gap: 5px; overflow-y: auto; padding: 12px 0; }.session-item { width: 100%; border: 1px solid transparent; border-radius: 5px; padding: 9px; background: transparent; color: var(--text_primary); cursor: pointer; text-align: left; }.session-item:hover, .session-item--active { border-color: var(--border_divider); background: var(--bg_brand_contain); }.session-title { display: block; overflow: hidden; font-size: 12px; font-weight: 700; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }.session-item small { display: block; margin-top: 4px; color: var(--text_tertiary); font-size: 10px; }.history-footer { display: flex; justify-content: space-between; gap: 8px; padding: 12px 4px 2px; border-top: 1px solid var(--border_divider); }.text-button--danger { color: var(--text_negative); }
.config-panel { padding: 20px; } .section-heading { margin-bottom: 18px; }.section-heading p { margin-bottom: 0; }
.field-label { display: block; margin: 16px 0 6px; color: var(--text_secondary); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.field-input { width: 100%; border: 1px solid var(--border_form); border-radius: 6px; padding: 9px 10px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
.field-input:focus { border-color: var(--border_brand); box-shadow: 0 0 0 2px var(--bg_brand_tag); }.key-storage-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; color: var(--text_tertiary); font-size: 11px; }.field-input:disabled { cursor: not-allowed; opacity: .55; }.prompt-input { resize: vertical; min-height: 130px; }.field-hint { margin: 6px 0 0; color: var(--text_tertiary); font-size: 12px; }.url-presets { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: -22px; }.text-button { border: 0; padding: 0; background: none; color: var(--text_brand); font: inherit; font-size: 12px; cursor: pointer; }.text-button:hover { text-decoration: underline; }.text-button:focus-visible, .generate-button:focus-visible, .close-button:focus-visible, .reference-item button:focus-visible { outline: 2px solid var(--border_brand); outline-offset: 2px; }
.parameter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.custom-size-row { display: grid; grid-template-columns: 1fr 16px 1fr; align-items: end; gap: 8px; }.custom-size-row .field-label { margin-top: 12px; }.size-divider { padding-bottom: 10px; color: var(--text_tertiary); text-align: center; }.progress-box { margin-top: 16px; padding: 10px; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_brand_contain); }.progress-meta { display: flex; justify-content: space-between; gap: 10px; color: var(--text_secondary); font-size: 12px; }.progress-meta strong { color: var(--text_brand); }.progress-track { height: 6px; margin-top: 8px; overflow: hidden; border-radius: 6px; background: var(--bg_tag); }.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--text_brand); transition: width .45s ease; }.progress-box p { margin: 7px 0 0; color: var(--text_tertiary); font-size: 11px; line-height: 1.45; }.upload-zone { display: flex; min-height: 90px; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1px dashed var(--border_form); border-radius: 6px; color: var(--text_brand); cursor: pointer; font-size: 13px; }.upload-zone:hover { border-color: var(--border_brand); background: var(--bg_brand_contain); }.upload-zone small { color: var(--text_tertiary); }.upload-zone input { display: none; }.reference-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }.reference-item { position: relative; width: 64px; height: 64px; margin: 0; overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; }.reference-item img { width: 100%; height: 100%; object-fit: cover; }.reference-item button { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border: 0; border-radius: 50%; background: var(--bg_component); color: var(--text_primary); cursor: pointer; }.error-message { margin: 14px 0 0; color: var(--text_negative); font-size: 12px; }.generate-button { width: 100%; min-height: 40px; margin-top: 18px; border: 0; border-radius: 6px; background: var(--text_brand); color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; transition: opacity .15s, transform .15s; }.generate-button:hover { opacity: .9; }.generate-button:active { transform: scale(.98); }.generate-button:disabled { cursor: not-allowed; opacity: .45; }.spinner, .result-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; vertical-align: -2px; }.spinner { margin-right: 7px; }
.result-panel { min-height: 680px; padding: 20px; }.result-header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid var(--border_divider); }.result-header p { margin-bottom: 0; }.result-state { display: flex; min-height: 560px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }.result-state strong { font-size: 15px; }.result-state p { max-width: 360px; margin: 8px 0 0; }.result-spinner { width: 22px; height: 22px; margin-bottom: 12px; color: var(--text_brand); }.image-grid { display: grid; gap: 14px; padding-top: 18px; }.image-grid--1 { grid-template-columns: minmax(0, 1fr); max-width: 760px; margin: 0 auto; }.image-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }.image-grid--3, .image-grid--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }.image-card { overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_layout); }.image-card img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; cursor: zoom-in; }.image-card footer { display: flex; justify-content: space-between; padding: 10px; color: var(--text_secondary); font-size: 12px; }.image-card a { color: var(--text_brand); text-decoration: none; }.image-card a:hover { text-decoration: underline; }.preview-overlay { position: fixed; z-index: 400; inset: 0; display: flex; align-items: center; justify-content: center; padding: 36px; background: rgba(0, 0, 0, .75); }.preview-overlay img { max-width: 100%; max-height: 100%; object-fit: contain; }.close-button { position: fixed; top: 16px; right: 18px; width: 38px; height: 38px; border: 0; border-radius: 6px; background: var(--bg_component); color: var(--text_primary); cursor: pointer; font-size: 24px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 860px) { .studio-shell { padding: 16px; }.topbar { gap: 12px; }.workspace { grid-template-columns: 1fr; }.result-panel { min-height: 480px; }.result-state { min-height: 360px; } }@media (max-width: 560px) { .image-grid--2, .image-grid--3, .image-grid--4 { grid-template-columns: 1fr; } }
</style>
