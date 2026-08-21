<template>
    <main class="studio-shell">
        <header class="topbar">
            <div class="brand-block">
                <p class="eyebrow">MMU / IMAGE TOOL</p>
                <h1>MMU Live Image Studio</h1>
            </div>
            <nav class="primary-tabs" aria-label="主导航">
                <RouterLink to="/" class="primary-tab primary-tab--active">工作台</RouterLink>
                <RouterLink to="/cases" class="primary-tab primary-tab--cases">
                    <span>案例灵感</span>
                    <em>523</em>
                </RouterLink>
            </nav>
            <div class="topbar-actions">
                <button type="button" class="settings-button" @click="historyCollapsed = !historyCollapsed">{{ historyCollapsed ? '展开历史' : '收起历史' }}</button>
                <button type="button" class="settings-button" @click="settingsOpen = true">偏好设置</button>
                <span class="security-note">本机浏览器存储 · 不上传</span>
            </div>
        </header>

        <section class="workspace" :class="{ 'workspace--history-collapsed': historyCollapsed }" data-module-id="image-generator-workbench">
            <aside v-if="!historyCollapsed" class="history-panel">
                <div class="history-header">
                    <div><h2>生成历史</h2><p>仅保存在此浏览器</p></div>
                    <button type="button" class="new-session-button" @click="createNewSession">+ 新建</button>
                </div>
                <input v-model.trim="historyQuery" class="history-search" type="search" placeholder="搜索标题或 Prompt" />
                <div v-if="historyLoading" class="history-empty">正在读取本地记录…</div>
                <div v-else-if="!filteredSessions.length" class="history-empty">暂无匹配记录<br /><small>生成的图片会默认保留在此设备。</small></div>
                <div v-else class="session-list">
                    <div v-for="session in filteredSessions" :key="session.id" class="session-row" :class="{ 'session-row--active': session.id === activeSessionId }">
                        <button type="button" class="session-item" @click="loadSession(session)">
                            <span class="session-title">{{ session.favorite ? '★ ' : '' }}{{ session.title }}</span>
                            <small>{{ formatSessionTime(session.updatedAt) }} · {{ session.images.length }} 张</small>
                        </button>
                        <button type="button" class="favorite-button" :aria-label="session.favorite ? '取消收藏' : '收藏会话'" @click="toggleFavorite(session)">{{ session.favorite ? '★' : '☆' }}</button>
                    </div>
                </div>
                <div v-if="sessions.length" class="storage-summary">{{ sessions.length }} 个会话 · {{ totalImageCount }} 张 · 约 {{ storageSizeLabel }}</div>
                <div v-if="sessions.length" class="history-footer">
                    <button type="button" class="text-button" :disabled="!hasSelectedSession" @click="renameCurrentSession">重命名</button>
                    <button type="button" class="text-button" :disabled="!hasSelectedSession" @click="exportCurrentSession">导出</button>
                    <label class="text-button import-button" :class="{ 'import-button--disabled': !hasSelectedSession }">导入<input type="file" accept="application/json" :disabled="!hasSelectedSession" @change="importSession" /></label>
                    <button type="button" class="text-button text-button--danger" :disabled="!hasSelectedSession" @click="deleteCurrentSession">删除</button>
                    <button type="button" class="text-button text-button--danger" :disabled="!hasSelectedSession" @click="clearAllSessions">清空</button>
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
                <div class="key-security-notice">
                    <span>你的 API Key 只会保存在当前浏览器中。</span>
                    <button v-if="apiKey" type="button" class="text-button" @click="clearSavedApiKey">清除已保存 Key</button>
                </div>

                <label class="field-label" for="model">图片模型</label>
                <select id="model" v-model="model" class="field-input">
                    <option v-for="item in models" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
                <p class="field-hint">{{ currentModel.protocol }}</p>
                <p v-if="!isGemini && (selectedSourceImage || referencePreviews.length)" class="capability-notice">GPT-Image-2 将使用 images/edits 接口，并以第一张图片作为编辑参考图。</p>

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
                <div v-if="size === 'custom'" class="custom-size-control">
                    <div class="custom-size-summary">
                        <span>自定义尺寸</span>
                        <strong>{{ customWidth }} × {{ customHeight }}</strong>
                    </div>
                    <div class="size-slider-field">
                        <label for="custom-width">宽度 <strong>{{ customWidth }} px</strong></label>
                        <input id="custom-width" v-model.number="customWidth" type="range" min="256" max="4096" step="64" />
                    </div>
                    <div class="size-slider-field">
                        <label for="custom-height">高度 <strong>{{ customHeight }} px</strong></label>
                        <input id="custom-height" v-model.number="customHeight" type="range" min="256" max="4096" step="64" />
                    </div>
                    <p>拖动滑块调整，步进 64 px。</p>
                </div>

                <div v-if="selectedSourceImage" class="source-image-box">
                    <div class="source-image-heading"><span>当前引用图</span><button type="button" class="text-button" @click="clearSelectedSource">取消引用</button></div>
                    <img :src="selectedSourceImage.dataUrl" alt="下一轮引用图片" />
                    <p>已带入上一轮图片。可继续修改提示词和参数后生成。</p>
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

            </aside>

            <section class="result-panel" data-module-id="image-generation-results">
                <div class="prompt-bar">
                    <div class="prompt-editor">
                        <textarea
                            id="prompt"
                            ref="promptTextarea"
                            v-model="prompt"
                            class="prompt-bar-input"
                            rows="2"
                            placeholder="描述想生成的画面、主体、风格、光线和构图"
                            @input="resizePromptTextarea"
                            @keydown.meta.enter.prevent="handleGenerate"
                            @keydown.ctrl.enter.prevent="handleGenerate"
                        ></textarea>
                        <div class="prompt-tools">
                            <span>{{ prompt.length }} 字 · Ctrl/Cmd + Enter 生成</span>
                            <div>
                                <button type="button" @click="copyPrompt">复制</button>
                                <button type="button" @click="prompt = ''">清空</button>
                            </div>
                        </div>
                    </div>
                    <button v-if="!generating" class="generate-button" type="button" :disabled="!canGenerate" @click="handleGenerate">生成</button>
                    <button v-else class="stop-button" type="button" @click="cancelGeneration">停止</button>
                </div>
                <div class="template-launcher">
                    <button type="button" class="template-toggle" :aria-expanded="templatesOpen" @click="templatesOpen = !templatesOpen">
                        <span>灵感模板</span><small>{{ templatesOpen ? '收起' : '展开' }}</small>
                    </button>
                    <div v-if="templatesOpen" class="template-workspace">
                        <div class="template-panel">
                            <article v-for="item in allPromptTemplates" :key="item.id" class="template-card">
                                <button type="button" class="template-apply" @click="applyPromptTemplate(item.prompt)"><strong>{{ item.name }}</strong><span>{{ item.description }}</span></button>
                                <div v-if="item.custom" class="template-card-actions"><button type="button" @click="startEditTemplate(item)">编辑</button><button type="button" @click="deletePromptTemplate(item.id)">删除</button></div>
                            </article>
                            <button type="button" class="template-add-card" @click="openTemplateEditor()"><strong>＋ 自定义模板</strong><span>保存自己的常用 Prompt</span></button>
                        </div>
                        <form v-if="templateEditorOpen" class="template-editor" @submit.prevent="savePromptTemplate">
                            <div><strong>{{ editingTemplateId ? '编辑模板' : '新建模板' }}</strong><button type="button" @click="closeTemplateEditor">×</button></div>
                            <input v-model.trim="templateDraft.name" maxlength="16" placeholder="模板名称" required />
                            <input v-model.trim="templateDraft.description" maxlength="30" placeholder="用途说明，例如：夜景氛围、霓虹光影" required />
                            <textarea v-model.trim="templateDraft.prompt" rows="3" maxlength="2000" placeholder="输入需要追加到 Prompt 的模板内容" required></textarea>
                            <footer><small>仅保存在当前浏览器</small><button type="submit">{{ editingTemplateId ? '保存修改' : '添加模板' }}</button></footer>
                        </form>
                    </div>
                </div>
                <div v-if="generating || error" class="prompt-bar-meta">
                    <div v-if="generating" class="progress-box" aria-live="polite">
                        <div class="progress-meta">
                            <span>{{ generationStats.total ? `已完成 ${generationStats.completed}/${generationStats.total}${generationStats.failed ? ` · 失败 ${generationStats.failed}` : ''}` : progressLabel }}</span>
                            <strong>{{ progress }}%</strong>
                        </div>
                        <div class="progress-track"><span :style="{ width: `${progress}%` }"></span></div>
                    </div>
                    <p v-if="error" class="error-message" role="alert">{{ error }}</p>
                </div>

                <div class="result-header">
                    <div>
                        <h2>生成结果</h2>
                        <p>{{ generating ? '正在请求模型，通常需要几十秒。' : resultDescription }}</p>
                    </div>
                    <div class="result-header-actions">
                        <button v-if="error && !generating" type="button" class="text-button" @click="handleGenerate">重试本轮</button>
                        <button v-if="generatedImages.length" type="button" class="text-button" @click="clearResults">清空结果</button>
                    </div>
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
                <div v-else class="round-list">
                    <section v-for="(round, roundIndex) in sessionRounds" :key="round.id" class="round-group">
                        <header class="round-header">
                            <div><strong>第 {{ roundIndex + 1 }} 轮</strong><span>{{ formatSessionTime(round.createdAt) }} · {{ modelName(round.model) }} · {{ round.size }}</span></div>
                            <button type="button" class="text-button" @click="downloadRound(round)">下载本轮全部</button>
                        </header>
                        <div v-if="roundSourceUrl(round)" class="creation-chain">
                            <div class="chain-source">
                                <span class="chain-kicker">引用来源</span>
                                <button type="button" class="chain-image" @click="previewImage = roundSourceUrl(round)"><img :src="roundSourceUrl(round)" alt="本轮引用来源" /></button>
                                <strong>{{ round.sourceLabel || '历史引用图' }}</strong>
                                <small v-if="round.extraReferenceCount">另有 {{ round.extraReferenceCount }} 张参考图</small>
                                <div class="chain-source-actions"><button type="button" class="chain-action" @click="reuseRoundSource(round)">再次引用</button><button type="button" class="chain-action" @click="openRoundSourceAnalysis(round, $event)">AI 分析</button></div>
                            </div>
                            <span class="chain-arrow">→</span>
                            <div class="chain-prompt">
                                <span class="chain-kicker">本轮修改指令</span>
                                <div class="chain-tags"><span>{{ modelName(round.model) }}</span><span>{{ round.size }}</span></div>
                                <p>{{ round.prompt }}</p>
                                <div><button type="button" @click="copyText(round.prompt)">复制 Prompt</button><button type="button" @click="restoreRound(round)">恢复到编辑框</button></div>
                            </div>
                            <span class="chain-arrow">→</span>
                            <div class="chain-results">
                                <span class="chain-kicker">生成结果 · {{ round.images.length }} 张</span>
                                <div class="image-grid" :class="`image-grid--${Math.min(round.images.length, 4)}`">
                                    <article v-for="(image, index) in round.images" :key="image.id" class="image-card" :class="{ 'image-card--selected': selectedSourceImage?.id === image.id, 'image-card--checked': selectedImageIds.has(image.id), 'image-card--favorite': favoriteImageIds.has(image.id) }">
                                        <button type="button" class="select-image-button" @click="toggleImageSelection(image.id)">{{ selectedImageIds.has(image.id) ? '√' : '选择' }}</button>
                                        <button type="button" class="favorite-image-button" @click="toggleFavoriteImage(image.id)">{{ favoriteImageIds.has(image.id) ? '★' : '☆' }}</button>
                                        <div class="image-thumb" @click="previewImage = image.dataUrl"><img :src="image.dataUrl" :alt="`第 ${roundIndex + 1} 轮结果 ${index + 1}`" :class="{ 'image-fit-cover': imageFit === 'cover' }" /><span class="zoom-hint">点击放大</span><div class="prompt-tooltip">{{ round.prompt }}</div></div>
                                        <footer><span>{{ selectedSourceImage?.id === image.id ? '当前引用图' : `结果 ${index + 1}` }}</span><div class="image-actions"><button v-if="selectedSourceImage?.id !== image.id" type="button" @click="selectImageAsSource(image)">引用继续</button><button v-else type="button" class="image-actions--active" disabled>已引用</button><button type="button" @click="openImageAnalysis(image, $event, `第 ${roundIndex + 1} 轮 · 结果 ${index + 1}`)">AI 分析</button><button type="button" @click="downloadImage(image, round, index)">下载</button></div></footer>
                                    </article>
                                </div>
                            </div>
                        </div>
                        <template v-else>
                            <p class="round-prompt">{{ round.prompt }}</p>
                            <div class="image-grid" :class="`image-grid--${Math.min(round.images.length, 4)}`">
                                <article v-for="(image, index) in round.images" :key="image.id" class="image-card" :class="{ 'image-card--selected': selectedSourceImage?.id === image.id, 'image-card--checked': selectedImageIds.has(image.id), 'image-card--favorite': favoriteImageIds.has(image.id) }">
                                    <button type="button" class="select-image-button" @click="toggleImageSelection(image.id)">{{ selectedImageIds.has(image.id) ? '√' : '选择' }}</button><button type="button" class="favorite-image-button" @click="toggleFavoriteImage(image.id)">{{ favoriteImageIds.has(image.id) ? '★' : '☆' }}</button>
                                    <div class="image-thumb" @click="previewImage = image.dataUrl"><img :src="image.dataUrl" :alt="`第 ${roundIndex + 1} 轮结果 ${index + 1}`" :class="{ 'image-fit-cover': imageFit === 'cover' }" /><span class="zoom-hint">点击放大</span><div class="prompt-tooltip">{{ round.prompt }}</div></div>
                                    <footer><span>{{ selectedSourceImage?.id === image.id ? '当前引用图' : `结果 ${index + 1}` }}</span><div class="image-actions"><button v-if="selectedSourceImage?.id !== image.id" type="button" @click="selectImageAsSource(image)">引用继续</button><button v-else type="button" class="image-actions--active" disabled>已引用</button><button type="button" @click="openImageAnalysis(image, $event, `第 ${roundIndex + 1} 轮 · 结果 ${index + 1}`)">AI 分析</button><button type="button" @click="downloadImage(image, round, index)">下载</button></div></footer>
                                </article>
                            </div>
                        </template>
                    </section>
                    <div v-if="selectedImageIds.size" class="batch-actions">
                        <span>已选 {{ selectedImageIds.size }} 张</span>
                        <button type="button" @click="compareSelected">并排对比</button>
                        <button type="button" @click="deleteUnselected">只保留选中</button>
                        <button type="button" @click="selectedImageIds.clear()">取消选择</button>
                    </div>
                </div>
            </section>
        </section>

        <div v-if="previewImage" class="preview-overlay" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="previewImage = ''">
            <button type="button" class="close-button" aria-label="关闭图片预览" @click="previewImage = ''">×</button>
            <img :src="previewImage" alt="生成图片大图预览" />
        </div>
        <div v-if="compareImages.length" class="preview-overlay compare-overlay" role="dialog" aria-modal="true" aria-label="图片对比" @click.self="compareImages = []">
            <button type="button" class="close-button" aria-label="关闭图片对比" @click="compareImages = []">×</button>
            <div class="compare-grid"><img v-for="image in compareImages" :key="image.id" :src="image.dataUrl" alt="选中图片对比" /></div>
        </div>
        <section v-if="analysisOpen" ref="analysisBubble" class="analysis-bubble" :class="{ 'analysis-bubble--minimized': analysisMinimized }" :style="analysisBubbleStyle" aria-label="AI 图像分析">
            <header class="analysis-header" @pointerdown="startAnalysisDrag">
                <div><img :src="analysisImage?.dataUrl" alt="当前分析图片" /><span><strong>AI 图像分析</strong><small>{{ analysisImageLabel }}</small></span></div>
                <nav><button type="button" @pointerdown.stop @click="reanchorAnalysis">回到图片</button><button type="button" @pointerdown.stop @click="analysisMinimized = !analysisMinimized">{{ analysisMinimized ? '展开' : '—' }}</button><button type="button" @pointerdown.stop @click="closeAnalysis">×</button></nav>
            </header>
            <template v-if="!analysisMinimized">
                <div class="analysis-controls"><select v-model="analysisModel" :disabled="analysisMessages.length > 0"><option value="gpt-5-6-terra">GPT-5.6 Terra</option><option value="gpt-5-6-sol">GPT-5.6 Sol</option><option value="gpt-5-6-luna">GPT-5.6 Luna</option></select><span>{{ analysisTurnCount }} / 5 轮</span></div>
                <div class="analysis-presets"><button v-for="item in analysisPresets" :key="item.label" type="button" :disabled="analysisStreaming || analysisTurnCount >= 5" @click="analysisInput = item.prompt">{{ item.label }}</button></div>
                <div ref="analysisConversation" class="analysis-conversation">
                    <div v-if="!analysisMessages.length" class="analysis-empty"><strong>从一个问题开始</strong><p>选择快捷问题，或输入自己的图片分析要求。</p></div>
                    <article v-for="(message, index) in analysisMessages" :key="index" :class="`analysis-message analysis-message--${message.role}`">
                        <strong>{{ message.role === 'user' ? '你' : `AI · ${analysisModelName}` }}</strong>
                        <p>{{ displayAnalysisContent(message.content) }}<span v-if="analysisStreaming && index === analysisMessages.length - 1 && message.role === 'assistant'" class="stream-caret"></span></p>
                        <div v-if="message.role === 'assistant' && message.content && !analysisStreaming" class="analysis-answer-actions"><button type="button" @click="copyText(displayAnalysisContent(message.content))">复制分析</button><button v-if="!analysisEditPrompts[index]" type="button" @click="extractEditPromptFromAnswer(index)">提炼为修改 Prompt</button></div>
                        <section v-if="message.role === 'assistant' && analysisEditPrompts[index]" class="edit-prompt-card"><header><strong>可执行修改 Prompt</strong><span>可编辑</span></header><textarea v-model="analysisEditPrompts[index]" rows="5" @change="persistAnalysisSession"></textarea><footer><button type="button" @click="copyText(analysisEditPrompts[index])">复制 Prompt</button><button type="button" @click="useEditPrompt(index)">替换顶部 Prompt</button><button type="button" @click="adoptEditPrompt(index)">引用当前图片并使用</button><button type="button" @click="regenerateEditPrompt(index)">重新提炼</button></footer></section>
                    </article>
                </div>
                <p v-if="analysisError" class="analysis-error">{{ analysisError }}</p>
                <form class="analysis-composer" @submit.prevent="sendAnalysisMessage"><textarea v-model.trim="analysisInput" rows="2" :disabled="analysisStreaming || analysisTurnCount >= 5" placeholder="继续追问，或输入自己的分析要求…" @keydown.ctrl.enter.prevent="sendAnalysisMessage" @keydown.meta.enter.prevent="sendAnalysisMessage"></textarea><div><button v-if="analysisStreaming" type="button" class="analysis-stop" @click="stopAnalysis">停止</button><button v-else-if="analysisError && analysisLastQuestion" type="button" @click="retryAnalysis">重试</button><button v-if="!analysisStreaming" type="submit" :disabled="!analysisInput.trim() || analysisTurnCount >= 5 || !apiKey.trim()">发送</button></div></form>
                <footer class="analysis-footer"><span>回答直接使用当前浏览器 API Key</span><button type="button" @click="resetAnalysis">开始新分析</button></footer>
            </template>
        </section>
        <aside v-if="settingsOpen" class="settings-drawer" aria-label="偏好设置">
            <header><h2>偏好设置</h2><button type="button" @click="settingsOpen = false">×</button></header>
            <label>默认模型<select v-model="preferences.defaultModel" class="field-input"><option v-for="item in models" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
            <label>默认尺寸<select v-model="preferences.defaultSize" class="field-input"><option v-for="preset in sizePresets" :key="preset.value" :value="preset.value">{{ preset.label }}</option></select></label>
            <label>默认生成数量<select v-model.number="preferences.defaultCount" class="field-input"><option v-for="item in 4" :key="item" :value="item">{{ item }} 张</option></select></label>
            <label>默认服务地址<input v-model.trim="preferences.defaultBaseUrl" class="field-input" type="url" /></label>
            <label>图片显示<select v-model="preferences.imageFit" class="field-input"><option value="contain">完整显示</option><option value="cover">铺满裁切</option></select></label>
            <label class="check-row"><input v-model="preferences.historyCollapsed" type="checkbox" />默认收起历史栏</label>
            <label>下载格式<select v-model="preferences.downloadFormat" class="field-input"><option value="png">PNG</option><option value="jpg">JPG</option></select></label>
            <label class="check-row"><input v-model="preferences.notifyOnComplete" type="checkbox" />生成完成后发送浏览器通知</label>
            <button type="button" class="apply-preferences" @click="savePreferences">保存并应用</button>
        </aside>
    </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { analyzeImageStream, generateImage, type GeneratedImage, type ImageModelId, type ReferenceImageInput, type VisionMessage, type VisionModelId } from '@/services/api';
import { clearSessions, deleteSession, listSessions, saveSession, type ImageGenerationSession } from '@/services/history';

const officeUrl = 'https://tokenverse.corp.kuaishou.com/v1beta';
const idcUrl = 'http://tokenverse.internal/v1beta';
const apiKeyStorageKey = 'mmu-live-image-studio.api-key';
const preferencesStorageKey = 'mmu-live-image-studio.preferences';
const promptTemplatesStorageKey = 'mmu-live-image-studio.prompt-templates';
const imageAnalysisStorageKey = 'mmu-live-image-studio.image-analysis';
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
let generationController: AbortController | undefined;
const generationStats = ref({ completed: 0, failed: 0, total: 0 });
const error = ref('');
const generatedImages = ref<GeneratedImage[]>([]);
const sessionRounds = ref<NonNullable<ImageGenerationSession['rounds']>>([]);
const selectedSourceImage = ref<GeneratedImage | null>();
const sessions = ref<ImageGenerationSession[]>([]);
const activeSessionId = ref(crypto.randomUUID());
const historyLoading = ref(true);
const historyQuery = ref('');
const previewImage = ref('');
const compareImages = ref<GeneratedImage[]>([]);
const selectedImageIds = ref(new Set<string>());
const favoriteImageIds = ref(new Set<string>());
const settingsOpen = ref(false);
const templatesOpen = ref(false);
const templateEditorOpen = ref(false);
const editingTemplateId = ref('');
const promptTextarea = ref<HTMLTextAreaElement | null>();
const templateDraft = ref({ name: '', description: '', prompt: '' });
const historyCollapsed = ref(false);
const imageFit = ref<'contain' | 'cover'>('contain');
const preferences = ref({
    defaultModel: 'gemini-3-1-flash-lite-image' as ImageModelId,
    defaultSize: '1024x1024',
    defaultCount: 1,
    defaultBaseUrl: officeUrl,
    historyCollapsed: false,
    imageFit: 'contain' as 'contain' | 'cover',
    downloadFormat: 'png' as 'png' | 'jpg',
    notifyOnComplete: false,
});
const referencePreviews = ref<Array<ReferenceImageInput & { id: string; dataUrl: string; name: string }>>([]);
const analysisOpen = ref(false);
const analysisMinimized = ref(false);
const analysisImage = ref<GeneratedImage | null>();
const analysisImageLabel = ref('');
const analysisOriginalPrompt = ref('');
const analysisModel = ref<VisionModelId>('gpt-5-6-terra');
const analysisMessages = ref<VisionMessage[]>([]);
const analysisInput = ref('');
const analysisStreaming = ref(false);
const analysisError = ref('');
const analysisLastQuestion = ref('');
const analysisBubble = ref<HTMLElement | null>();
const analysisConversation = ref<HTMLElement | null>();
const analysisPosition = ref({ x: 0, y: 0 });
const analysisAnchorElement = ref<HTMLElement | null>();
let analysisController: AbortController | undefined;
interface SavedAnalysisSession { model: VisionModelId; messages: VisionMessage[]; label: string; originalPrompt?: string; editPrompts?: Record<number, string> }
const savedAnalysisSessions = ref<Record<string, SavedAnalysisSession>>({});
const analysisEditPrompts = ref<Record<number, string>>({});
const structuredOutputRule = `\n\n请严格使用以下格式输出，不要省略标签：\n<analysis>只列出确实需要改进的内容，保持简洁，不罗列正常项目。</analysis>\n<edit_prompt>给出完整、独立、可直接用于图片编辑模型的修改 Prompt。明确保持不变的主体身份、五官、姿势、构图、服装、光线和风格；只修复实际问题；使用肯定、可执行语言；加入防止新增人物、肢体、文字或物体的必要约束；不要包含分析过程、评分、“可能”“建议”等解释性语言。</edit_prompt>`;
const analysisPresets = [
    { label: '画面优化 Prompt', prompt: `请分析画面内容与视觉效果，并生成整体优化 Prompt。${structuredOutputRule}` },
    { label: '效果精修 Prompt', prompt: `请评价构图、色彩、光影、主体表现、细节完整度与视觉层级，并生成精修 Prompt。${structuredOutputRule}` },
    { label: '可执行修改 Prompt', prompt: `请找出最值得修改的问题，按优先级总结，并生成可执行修改 Prompt。${structuredOutputRule}` },
    { label: '瑕疵修复 Prompt', prompt: `请检查肢体、五官、文字、透视、边缘、重复元素、材质和光影，只指出真实瑕疵并生成修复 Prompt。${structuredOutputRule}` },
    { label: '反推完整 Prompt', prompt: `请反推这张图片的完整生成 Prompt。${structuredOutputRule}` },
    { label: '保持主体精修', prompt: `请保持主体身份、姿势和构图不变，找出可改进处并生成精修 Prompt。${structuredOutputRule}` },
];

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
interface PromptTemplate { id: string; name: string; description: string; prompt: string; custom?: boolean }
const promptTemplates: PromptTemplate[] = [
    { id: 'builtin-photo', name: '摄影写实', description: '自然光、真实质感', prompt: '写实摄影风格，自然光线，真实材质与细节，主体清晰，构图专业，高动态范围。' },
    { id: 'builtin-poster', name: '产品海报', description: '棚拍布光、商业构图', prompt: '商业产品海报，主体居中，干净背景，棚拍级布光，明确视觉层级，保留文案留白区域。' },
    { id: 'builtin-portrait', name: '人物肖像', description: '柔和轮廓、电影质感', prompt: '高质量人物肖像，神态自然，柔和轮廓光，细腻肤质，浅景深，电影感构图。' },
    { id: 'builtin-ui', name: 'UI 概念图', description: '清晰层级、精致组件', prompt: '现代数字产品 UI 概念图，信息层级清晰，留白克制，组件精致，专业产品设计展示。' },
    { id: 'builtin-illustration', name: '编辑插画', description: '统一色彩、叙事画面', prompt: '精致编辑插画，统一色彩体系，轮廓清晰，画面富有叙事性，细节丰富且构图平衡。' },
];
const customPromptTemplates = ref<PromptTemplate[]>([]);
const allPromptTemplates = computed(() => [...promptTemplates, ...customPromptTemplates.value]);

const filteredSessions = computed(() => {
    const keyword = historyQuery.value.toLowerCase();
    return sessions.value
        .filter((session) => !keyword || session.title.toLowerCase().includes(keyword) || session.prompt.toLowerCase().includes(keyword))
        .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || b.updatedAt - a.updatedAt);
});
const hasSelectedSession = computed(() => sessions.value.some((session) => session.id === activeSessionId.value));
const totalImageCount = computed(() => sessions.value.reduce((total, session) => total + session.images.length, 0));
const estimatedStorageBytes = computed(() => sessions.value.reduce((total, session) => total + session.images.reduce((sum, image) => sum + Math.round(image.dataUrl.length * 0.75), 0), 0));
const storageSizeLabel = computed(() => estimatedStorageBytes.value > 1024 * 1024
    ? `${(estimatedStorageBytes.value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(estimatedStorageBytes.value / 1024))} KB`);
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
    const savedTemplates = window.localStorage.getItem(promptTemplatesStorageKey);
    if (savedTemplates) {
        try { customPromptTemplates.value = JSON.parse(savedTemplates); } catch { /* ignore invalid local templates */ }
    }
    const savedAnalysis = window.localStorage.getItem(imageAnalysisStorageKey);
    if (savedAnalysis) {
        try { savedAnalysisSessions.value = JSON.parse(savedAnalysis); } catch { /* ignore invalid analysis history */ }
    }
    await nextTick();
    resizePromptTextarea();
    const caseDraft = window.localStorage.getItem('mmu-live-image-studio.case-draft');
    if (caseDraft) {
        try {
            const parsed = JSON.parse(caseDraft) as { prompt?: string };
            if (parsed.prompt) prompt.value = parsed.prompt;
        } catch { /* ignore invalid case draft */ }
        window.localStorage.removeItem('mmu-live-image-studio.case-draft');
    }
    const savedPreferences = window.localStorage.getItem(preferencesStorageKey);
    if (savedPreferences) {
        try {
            preferences.value = { ...preferences.value, ...JSON.parse(savedPreferences) };
            model.value = preferences.value.defaultModel;
            size.value = preferences.value.defaultSize;
            count.value = preferences.value.defaultCount;
            baseUrl.value = preferences.value.defaultBaseUrl;
            historyCollapsed.value = preferences.value.historyCollapsed;
            imageFit.value = preferences.value.imageFit;
        } catch { /* ignore invalid local preferences */ }
    }
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
async function copyPrompt() {
    if (!prompt.value) return;
    await navigator.clipboard.writeText(prompt.value);
}
function resizePromptTextarea() {
    const textarea = promptTextarea.value;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 78), 220)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 220 ? 'auto' : 'hidden';
}
watch(prompt, () => nextTick(resizePromptTextarea));
function applyPromptTemplate(template: string) {
    prompt.value = prompt.value ? `${prompt.value.trimEnd()}\n${template}` : template;
}
function persistPromptTemplates() {
    window.localStorage.setItem(promptTemplatesStorageKey, JSON.stringify(customPromptTemplates.value));
}
function openTemplateEditor() {
    editingTemplateId.value = '';
    templateDraft.value = { name: '', description: '', prompt: prompt.value };
    templateEditorOpen.value = true;
}
function startEditTemplate(item: PromptTemplate) {
    editingTemplateId.value = item.id;
    templateDraft.value = { name: item.name, description: item.description, prompt: item.prompt };
    templateEditorOpen.value = true;
}
function closeTemplateEditor() {
    templateEditorOpen.value = false;
    editingTemplateId.value = '';
}
function savePromptTemplate() {
    const template: PromptTemplate = { id: editingTemplateId.value || crypto.randomUUID(), ...templateDraft.value, custom: true };
    customPromptTemplates.value = editingTemplateId.value
        ? customPromptTemplates.value.map((item) => item.id === editingTemplateId.value ? template : item)
        : [...customPromptTemplates.value, template];
    persistPromptTemplates();
    closeTemplateEditor();
}
function deletePromptTemplate(id: string) {
    if (!window.confirm('确认删除这个自定义模板？')) return;
    customPromptTemplates.value = customPromptTemplates.value.filter((item) => item.id !== id);
    persistPromptTemplates();
}
function cancelGeneration() {
    generationController?.abort();
}
function positionAnalysisBubble(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(500, window.innerWidth - 24);
    const height = analysisMinimized.value ? 58 : Math.min(600, window.innerHeight * .72);
    const above = rect.top - height - 12;
    const x = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const y = above >= 12 ? above : Math.min(window.innerHeight - height - 12, rect.bottom + 12);
    analysisPosition.value = { x, y: Math.max(12, y) };
}
function openImageAnalysis(image: GeneratedImage, event: MouseEvent, label: string) {
    analysisImage.value = image;
    analysisImageLabel.value = label;
    const sourceRound = sessionRounds.value.find((round) => round.images.some((item) => item.id === image.id));
    analysisOriginalPrompt.value = sourceRound?.prompt || '';
    analysisAnchorElement.value = (event.currentTarget as HTMLElement).closest('.image-card') || event.currentTarget as HTMLElement;
    const saved = savedAnalysisSessions.value[image.id];
    analysisModel.value = saved?.model || 'gpt-5-6-terra';
    analysisMessages.value = saved?.messages ? JSON.parse(JSON.stringify(saved.messages)) : [];
    analysisOriginalPrompt.value = saved?.originalPrompt || analysisOriginalPrompt.value;
    analysisEditPrompts.value = saved?.editPrompts ? { ...saved.editPrompts } : {};
    analysisOpen.value = true;
    analysisMinimized.value = false;
    analysisError.value = '';
    nextTick(() => positionAnalysisBubble(analysisAnchorElement.value!));
}
function openRoundSourceAnalysis(round: NonNullable<ImageGenerationSession['rounds']>[number], event: MouseEvent) {
    const dataUrl = roundSourceUrl(round);
    if (!dataUrl) return;
    openImageAnalysis({ id: round.sourceImageId || `source-${round.id}`, dataUrl }, event, round.sourceLabel || '引用来源图');
    if (!analysisOriginalPrompt.value) analysisOriginalPrompt.value = round.prompt;
}
function closeAnalysis() {
    stopAnalysis();
    analysisOpen.value = false;
}
function reanchorAnalysis() {
    analysisAnchorElement.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => analysisAnchorElement.value && positionAnalysisBubble(analysisAnchorElement.value), 350);
}
function startAnalysisDrag(event: PointerEvent) {
    if ((event.target as HTMLElement).closest('button')) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...analysisPosition.value };
    const move = (moveEvent: PointerEvent) => {
        const width = analysisBubble.value?.offsetWidth || 500;
        const height = analysisBubble.value?.offsetHeight || 58;
        analysisPosition.value = {
            x: Math.min(Math.max(8, origin.x + moveEvent.clientX - startX), window.innerWidth - width - 8),
            y: Math.min(Math.max(8, origin.y + moveEvent.clientY - startY), window.innerHeight - height - 8),
        };
    };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
}
function persistAnalysisSession() {
    if (!analysisImage.value) return;
    savedAnalysisSessions.value[analysisImage.value.id] = { model: analysisModel.value, messages: analysisMessages.value, label: analysisImageLabel.value, originalPrompt: analysisOriginalPrompt.value, editPrompts: analysisEditPrompts.value };
    window.localStorage.setItem(imageAnalysisStorageKey, JSON.stringify(savedAnalysisSessions.value));
}
function parseStructuredAnswer(content: string) {
    const analysis = content.match(/<analysis>([\s\S]*?)<\/analysis>/i)?.[1]?.trim();
    const editPrompt = content.match(/<edit_prompt>([\s\S]*?)<\/edit_prompt>/i)?.[1]?.trim();
    return { analysis: analysis || content.replace(/<\/?(?:analysis|edit_prompt)>/gi, '').trim(), editPrompt: editPrompt || '' };
}
function displayAnalysisContent(content: string) { return parseStructuredAnswer(content).analysis; }
async function sendAnalysisMessage() {
    const question = analysisInput.value.trim();
    if (!question || !analysisImage.value || analysisStreaming.value || analysisTurnCount.value >= 5) return;
    analysisLastQuestion.value = question;
    analysisMessages.value.push({ role: 'user', content: question }, { role: 'assistant', content: '' });
    analysisInput.value = '';
    analysisStreaming.value = true;
    analysisError.value = '';
    analysisController = new AbortController();
    await nextTick();
    analysisConversation.value?.scrollTo({ top: analysisConversation.value.scrollHeight, behavior: 'smooth' });
    try {
        await analyzeImageStream({ apiKey: apiKey.value, baseUrl: 'https://tokenverse.corp.kuaishou.com/v1', model: analysisModel.value, imageDataUrl: analysisImage.value.dataUrl, messages: analysisMessages.value.slice(0, -1), originalPrompt: analysisOriginalPrompt.value, signal: analysisController.signal, onDelta: (delta) => {
            analysisMessages.value[analysisMessages.value.length - 1].content += delta;
            nextTick(() => analysisConversation.value?.scrollTo({ top: analysisConversation.value.scrollHeight }));
        } });
        const answerIndex = analysisMessages.value.length - 1;
        const parsed = parseStructuredAnswer(analysisMessages.value[answerIndex].content);
        if (parsed.editPrompt) analysisEditPrompts.value[answerIndex] = parsed.editPrompt;
        persistAnalysisSession();
    } catch (requestError: any) {
        if (requestError?.name !== 'AbortError') analysisError.value = `分析失败：${requestError?.message || '请稍后重试'}`;
        if (!analysisMessages.value.at(-1)?.content) analysisMessages.value.pop();
    } finally {
        analysisStreaming.value = false;
    }
}
function stopAnalysis() { analysisController?.abort(); }
function retryAnalysis() { analysisInput.value = analysisLastQuestion.value; analysisError.value = ''; }
function resetAnalysis() { stopAnalysis(); analysisMessages.value = []; analysisEditPrompts.value = {}; analysisError.value = ''; analysisLastQuestion.value = ''; persistAnalysisSession(); }
async function requestEditPrompt(answerIndex: number) {
    if (!analysisImage.value || analysisStreaming.value) return;
    const answer = displayAnalysisContent(analysisMessages.value[answerIndex]?.content || '');
    if (!answer) return;
    analysisStreaming.value = true;
    analysisError.value = '';
    analysisController = new AbortController();
    let raw = '';
    try {
        await analyzeImageStream({
            apiKey: apiKey.value,
            baseUrl: 'https://tokenverse.corp.kuaishou.com/v1',
            model: analysisModel.value,
            imageDataUrl: analysisImage.value.dataUrl,
            originalPrompt: analysisOriginalPrompt.value,
            messages: [{ role: 'user', content: `请把下面的分析转换成完整、独立、可直接用于图片编辑模型的修改 Prompt。只输出 <edit_prompt>...</edit_prompt>，不要输出分析或解释。必须明确保持不变的主体身份、五官、姿势、构图、服装、光线和风格；只修复分析中真实存在的问题；加入防止新增人物、肢体、文字或物体的必要约束。\n\n分析：\n${answer}` }],
            signal: analysisController.signal,
            onDelta: (delta) => { raw += delta; },
        });
        const extracted = raw.match(/<edit_prompt>([\s\S]*?)<\/edit_prompt>/i)?.[1]?.trim() || raw.replace(/<\/?edit_prompt>/gi, '').trim();
        if (!extracted) throw new Error('模型未返回可用的修改 Prompt。');
        analysisEditPrompts.value[answerIndex] = extracted;
        persistAnalysisSession();
    } catch (requestError: any) {
        if (requestError?.name !== 'AbortError') analysisError.value = `提炼失败：${requestError?.message || '请重试'}`;
    } finally { analysisStreaming.value = false; }
}
function extractEditPromptFromAnswer(index: number) { return requestEditPrompt(index); }
function regenerateEditPrompt(index: number) { return requestEditPrompt(index); }
function useEditPrompt(index: number) { prompt.value = analysisEditPrompts.value[index] || ''; }
function adoptEditPrompt(index: number) {
    if (!analysisImage.value || !analysisEditPrompts.value[index]) return;
    selectImageAsSource(analysisImage.value);
    prompt.value = analysisEditPrompts.value[index];
    analysisMinimized.value = true;
    nextTick(() => promptTextarea.value?.focus());
}
const resultDescription = computed(() => generatedImages.value.length ? `已生成 ${generatedImages.value.length} 张图片。` : '生成完成后，图片会显示在这里。');
const analysisTurnCount = computed(() => analysisMessages.value.filter((message) => message.role === 'user').length);
const analysisModelName = computed(() => ({ 'gpt-5-6-terra': 'Terra', 'gpt-5-6-sol': 'Sol', 'gpt-5-6-luna': 'Luna' }[analysisModel.value]));
const analysisBubbleStyle = computed(() => ({ left: `${analysisPosition.value.x}px`, top: `${analysisPosition.value.y}px` }));

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

function modelName(id: ImageModelId) {
    return models.find((item) => item.id === id)?.name || id;
}
function roundSourceUrl(round: NonNullable<ImageGenerationSession['rounds']>[number]) {
    if (round.sourceImageDataUrl) return round.sourceImageDataUrl;
    if (!round.sourceImageId) return '';
    return sessionRounds.value.flatMap((item) => item.images).find((image) => image.id === round.sourceImageId)?.dataUrl || '';
}
async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
}
function restoreRound(round: NonNullable<ImageGenerationSession['rounds']>[number]) {
    prompt.value = round.prompt;
    model.value = round.model;
    count.value = round.count;
    if (sizePresets.some((preset) => preset.value === round.size)) size.value = round.size;
    else {
        const [width, height] = round.size.split('x').map(Number);
        size.value = 'custom';
        customWidth.value = width || 1024;
        customHeight.value = height || 1024;
    }
}
function reuseRoundSource(round: NonNullable<ImageGenerationSession['rounds']>[number]) {
    const dataUrl = roundSourceUrl(round);
    if (!dataUrl) return;
    selectedSourceImage.value = { id: round.sourceImageId || crypto.randomUUID(), dataUrl };
    restoreRound(round);
}
function downloadFilename(round: NonNullable<ImageGenerationSession['rounds']>[number], index: number) {
    return `${sessionTitle(round.prompt)}-${round.createdAt}-${index + 1}.${preferences.value.downloadFormat}`;
}
async function imageDownloadUrl(image: GeneratedImage) {
    if (preferences.value.downloadFormat === 'png') return image.dataUrl;
    const source = new Image();
    source.src = image.dataUrl;
    await source.decode();
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return image.dataUrl;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.94);
}
async function downloadImage(image: GeneratedImage, round: NonNullable<ImageGenerationSession['rounds']>[number], index: number) {
    const anchor = document.createElement('a');
    anchor.href = await imageDownloadUrl(image);
    anchor.download = downloadFilename(round, index);
    anchor.click();
}
async function downloadRound(round: NonNullable<ImageGenerationSession['rounds']>[number]) {
    for (const [index, image] of round.images.entries()) await downloadImage(image, round, index);
}
function toggleImageSelection(id: string) {
    const next = new Set(selectedImageIds.value);
    if (next.has(id)) next.delete(id); else next.add(id);
    selectedImageIds.value = next;
}
async function toggleFavoriteImage(id: string) {
    const next = new Set(favoriteImageIds.value);
    if (next.has(id)) next.delete(id); else next.add(id);
    favoriteImageIds.value = next;
    const current = sessions.value.find((session) => session.id === activeSessionId.value);
    if (current) {
        const updated = { ...current, favoriteImageIds: [...next], updatedAt: Date.now() };
        await saveSession(JSON.parse(JSON.stringify(updated)) as ImageGenerationSession);
        sessions.value = sessions.value.map((session) => session.id === updated.id ? updated : session);
    }
}
function compareSelected() {
    compareImages.value = generatedImages.value.filter((image) => selectedImageIds.value.has(image.id));
}
async function deleteUnselected() {
    if (!window.confirm('只保留已选图片，并删除当前会话中的其他图片吗？')) return;
    sessionRounds.value = sessionRounds.value.map((round) => ({ ...round, images: round.images.filter((image) => selectedImageIds.value.has(image.id)) })).filter((round) => round.images.length);
    generatedImages.value = sessionRounds.value.flatMap((round) => round.images);
    const current = sessions.value.find((session) => session.id === activeSessionId.value);
    if (current) {
        const updated = { ...current, images: generatedImages.value, rounds: sessionRounds.value, updatedAt: Date.now() };
        await saveSession(JSON.parse(JSON.stringify(updated)) as ImageGenerationSession);
        sessions.value = [updated, ...sessions.value.filter((session) => session.id !== updated.id)];
    }
    selectedImageIds.value = new Set();
}
async function toggleFavorite(session: ImageGenerationSession) {
    const updated = { ...session, favorite: !session.favorite };
    await saveSession(JSON.parse(JSON.stringify(updated)) as ImageGenerationSession);
    sessions.value = sessions.value.map((item) => item.id === session.id ? updated : item);
}
async function renameCurrentSession() {
    const current = sessions.value.find((session) => session.id === activeSessionId.value);
    if (!current) return;
    const title = window.prompt('输入新的会话名称', current.title)?.trim();
    if (!title) return;
    const updated = { ...current, title, updatedAt: Date.now() };
    await saveSession(JSON.parse(JSON.stringify(updated)) as ImageGenerationSession);
    sessions.value = sessions.value.map((item) => item.id === current.id ? updated : item);
}
function exportCurrentSession() {
    const current = sessions.value.find((session) => session.id === activeSessionId.value);
    if (!current) return;
    const blob = new Blob([JSON.stringify(current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sessionTitle(current.title)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}
async function importSession(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
        const imported = JSON.parse(await file.text()) as ImageGenerationSession;
        if (!imported.id || !Array.isArray(imported.images)) throw new Error('文件格式不正确');
        imported.id = crypto.randomUUID();
        imported.updatedAt = Date.now();
        await saveSession(imported);
        sessions.value = [imported, ...sessions.value];
        loadSession(imported);
    } catch (importError: any) {
        error.value = `导入失败：${importError?.message || '文件格式不正确'}`;
    }
    (event.target as HTMLInputElement).value = '';
}
async function savePreferences() {
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences.value));
    model.value = preferences.value.defaultModel;
    size.value = preferences.value.defaultSize;
    count.value = preferences.value.defaultCount;
    baseUrl.value = preferences.value.defaultBaseUrl;
    historyCollapsed.value = preferences.value.historyCollapsed;
    imageFit.value = preferences.value.imageFit;
    if (preferences.value.notifyOnComplete && Notification.permission === 'default') await Notification.requestPermission();
    settingsOpen.value = false;
}

async function persistCurrentSession(roundImages: GeneratedImage[]) {
    if (!roundImages.length) return;
    const now = Date.now();
    const existing = sessions.value.find((item) => item.id === activeSessionId.value);
    const sourceRoundIndex = selectedSourceImage.value
        ? sessionRounds.value.findIndex((item) => item.images.some((image) => image.id === selectedSourceImage.value?.id))
        : -1;
    const primaryUpload = !selectedSourceImage.value ? referencePreviews.value[0] : undefined;
    const sourceRound = sourceRoundIndex >= 0 ? sessionRounds.value[sourceRoundIndex] : undefined;
    const round = {
        id: crypto.randomUUID(),
        createdAt: now,
        prompt: prompt.value,
        model: model.value,
        size: resolvedSize.value,
        count: count.value,
        sourceImageId: selectedSourceImage.value?.id || primaryUpload?.id,
        sourceImageDataUrl: selectedSourceImage.value?.dataUrl || primaryUpload?.dataUrl,
        sourceRoundId: sourceRound?.id,
        sourceLabel: selectedSourceImage.value
            ? `第 ${sourceRoundIndex + 1} 轮 · 结果 ${Math.max(0, sourceRound?.images.findIndex((image) => image.id === selectedSourceImage.value?.id) ?? 0) + 1}`
            : primaryUpload ? `上传参考图 · ${primaryUpload.name}` : undefined,
        sourceType: selectedSourceImage.value ? 'generated' as const : primaryUpload ? 'upload' as const : undefined,
        extraReferenceCount: Math.max(0, referencePreviews.value.length - (primaryUpload ? 1 : 0)),
        images: roundImages.map(({ id, dataUrl }) => ({ id, dataUrl })),
    };
    sessionRounds.value = [...sessionRounds.value, round];
    const session: ImageGenerationSession = {
        id: activeSessionId.value,
        title: existing?.title || sessionTitle(prompt.value),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        prompt: prompt.value,
        model: model.value,
        size: resolvedSize.value,
        count: count.value,
        images: sessionRounds.value.flatMap((item) => item.images),
        rounds: sessionRounds.value,
        favorite: existing?.favorite,
        favoriteImageIds: [...favoriteImageIds.value],
    };
    await saveSession(JSON.parse(JSON.stringify(session)) as ImageGenerationSession);
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)];
}

function selectImageAsSource(image: GeneratedImage) {
    selectedSourceImage.value = { id: image.id, dataUrl: image.dataUrl };
    const matchingRound = sessionRounds.value.find((round) => round.images.some((item) => item.id === image.id));
    if (matchingRound) {
        prompt.value = matchingRound.prompt;
        model.value = matchingRound.model;
        if (sizePresets.some((preset) => preset.value === matchingRound.size)) {
            size.value = matchingRound.size;
        } else {
            const [width, height] = matchingRound.size.split('x').map(Number);
            size.value = 'custom';
            customWidth.value = width || 1024;
            customHeight.value = height || 1024;
        }
        count.value = matchingRound.count;
    }
    previewImage.value = '';
}

function clearSelectedSource() {
    selectedSourceImage.value = null;
}

function sourceImageToReference(image: GeneratedImage): ReferenceImageInput {
    const [meta, base64] = image.dataUrl.split(',');
    const mimeType = meta.match(/^data:([^;]+)/)?.[1] || 'image/png';
    return { mimeType, base64: base64 || '' };
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
    sessionRounds.value = session.rounds || [{
        id: crypto.randomUUID(), createdAt: session.updatedAt, prompt: session.prompt, model: session.model,
        size: session.size, count: session.count, images: session.images,
    }];
    generatedImages.value = session.images;
    compareImages.value = [];
    favoriteImageIds.value = new Set(session.favoriteImageIds || []);
    selectedImageIds.value = new Set();
    selectedSourceImage.value = null;
    previewImage.value = '';
}

function createNewSession() {
    activeSessionId.value = crypto.randomUUID();
    prompt.value = '';
    generatedImages.value = [];
    sessionRounds.value = [];
    selectedImageIds.value = new Set();
    favoriteImageIds.value = new Set();
    compareImages.value = [];
    selectedSourceImage.value = null;
    referencePreviews.value = [];
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
    selectedImageIds.value = new Set();
    compareImages.value = [];
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
    generationController = new AbortController();
    generationStats.value = { completed: 0, failed: 0, total: count.value };
    startProgress();
    try {
        const result = await generateImage({
            apiKey: apiKey.value,
            baseUrl: baseUrl.value,
            model: model.value,
            prompt: size.value === 'custom' && isGemini.value
                ? `${prompt.value}\n\n请输出 ${resolvedSize.value} 像素画幅，保持该宽高比。`
                : prompt.value,
            size: resolvedSize.value,
            count: count.value,
            referenceImages: [
                ...(selectedSourceImage.value ? [sourceImageToReference(selectedSourceImage.value)] : []),
                ...referencePreviews.value.map(({ mimeType, base64 }) => ({ mimeType, base64 })),
            ],
            signal: generationController.signal,
            onProgress: (stats) => {
                generationStats.value = stats;
                progress.value = Math.max(progress.value, Math.round(((stats.completed + stats.failed) / stats.total) * 96));
            },
        });
        const newImages = result.images;
        generatedImages.value = [...generatedImages.value, ...newImages];
        stopProgress(true);
        if (preferences.value.notifyOnComplete && Notification.permission === 'granted') {
            new Notification('图片生成完成', { body: `已生成 ${newImages.length} 张图片。` });
        }
        if (result.failed) error.value = `${result.failed} 张生成失败，已保留成功的 ${newImages.length} 张。`;
        try {
            await persistCurrentSession(newImages);
        } catch (historyError: any) {
            error.value = `图片已生成，但本地历史保存失败：${historyError?.message || '请刷新后重试。'}`;
        }
    } catch (requestError: any) {
        stopProgress(false);
        error.value = requestError?.name === 'AbortError'
            ? '已停止本轮生成。'
            : requestError?.message || '无法生成图片，请检查服务地址、API Key 与模型权限后重试。';
    } finally {
        generating.value = false;
        generationController = undefined;
    }
}
</script>

<style scoped>
.studio-shell { display: flex; box-sizing: border-box; height: 100dvh; min-height: 0; flex-direction: column; overflow: hidden; background: var(--bg_contain); color: var(--text_primary); padding: 16px 20px; }
.topbar { display: grid; flex: 0 0 auto; grid-template-columns: minmax(240px, 1fr) auto minmax(240px, 1fr); align-items: center; width: 100%; margin: 0 0 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border_divider); }.brand-block { min-width: 0; }.primary-tabs { display: flex; align-items: center; gap: 4px; padding: 4px; border: 1px solid var(--border_divider); border-radius: 8px; background: var(--bg_component); }.primary-tab { position: relative; display: inline-flex; align-items: center; gap: 7px; border-radius: 5px; padding: 7px 12px; color: var(--text_secondary); font-size: 13px; font-weight: 600; text-decoration: none; transition: color .18s ease, background .18s ease, transform .18s ease; }.primary-tab:hover { color: var(--text_primary); background: var(--bg_hover); transform: translateY(-1px); }.primary-tab--active { background: var(--bg_brand_contain); color: var(--text_brand); }.primary-tab--active::after { position: absolute; right: 12px; bottom: 3px; left: 12px; height: 2px; border-radius: 2px; background: var(--text_brand); content: ''; animation: tab-indicator-in .32s ease-out both; }.primary-tab--cases { color: var(--text_brand); background: var(--bg_brand_contain); animation: case-tab-enter .45s ease-out both; }.primary-tab--cases::before { position: absolute; inset: 0; border: 1px solid var(--border_brand); border-radius: 5px; content: ''; opacity: .52; animation: case-tab-pulse 2.6s ease-in-out infinite; pointer-events: none; }.primary-tab--cases:hover { background: var(--bg_brand_tag); }.primary-tab em { position: relative; z-index: 1; border-radius: 10px; padding: 1px 6px; background: var(--text_brand); color: var(--bg_component); font-size: 10px; font-style: normal; line-height: 1.4; }.topbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }.settings-button { border: 1px solid var(--border_form); border-radius: 6px; padding: 6px 10px; background: var(--bg_component); color: var(--text_secondary); cursor: pointer; font: inherit; font-size: 12px; transition: border-color .18s ease, color .18s ease, transform .18s ease; }.settings-button:hover { border-color: var(--border_brand_hover); color: var(--text_brand); transform: translateY(-1px); } @keyframes tab-indicator-in { from { transform: scaleX(.35); opacity: 0; } to { transform: scaleX(1); opacity: 1; } } @keyframes case-tab-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } } @keyframes case-tab-pulse { 0%, 100% { opacity: .16; } 50% { opacity: .68; } } @media (prefers-reduced-motion: reduce) { .primary-tab, .settings-button { transition: none; } .primary-tab--active::after, .primary-tab--cases, .primary-tab--cases::before { animation: none; } }
.eyebrow { margin: 0 0 6px; color: var(--text_brand); font-size: 11px; font-weight: 700; letter-spacing: .12em; }
h1, h2, p { margin-top: 0; } h1 { margin-bottom: 0; font-size: 24px; line-height: 1.25; letter-spacing: -.02em; } h2 { margin-bottom: 6px; font-size: 16px; } p { color: var(--text_secondary); font-size: 13px; line-height: 1.65; }
.security-note { border: 1px solid var(--border_divider); border-radius: 999px; padding: 5px 10px; color: var(--text_secondary); font-size: 12px; background: var(--bg_component); }
.workspace { display: grid; min-height: 0; flex: 1; grid-template-columns: clamp(210px, 17vw, 280px) clamp(260px, 20vw, 330px) minmax(420px, 1fr); gap: 14px; width: 100%; }.workspace--history-collapsed { grid-template-columns: clamp(260px, 20vw, 330px) minmax(420px, 1fr); }
.history-panel, .config-panel, .result-panel { min-height: 0; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_component); }
.history-panel { display: flex; min-height: 0; flex-direction: column; padding: 16px 14px; overflow: hidden; }.history-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 4px 4px 14px; border-bottom: 1px solid var(--border_divider); }.history-header h2 { margin: 0 0 4px; }.history-header p { margin: 0; color: var(--text_tertiary); font-size: 12px; }.history-search { box-sizing: border-box; width: 100%; margin-top: 10px; border: 1px solid var(--border_form); border-radius: 6px; padding: 8px 9px; background: var(--bg_component); color: var(--text_primary); }.new-session-button { border: 1px solid var(--border_brand); border-radius: 5px; padding: 5px 8px; background: var(--bg_brand_contain); color: var(--text_brand); cursor: pointer; font-size: 12px; font-weight: 700; }.new-session-button:hover { background: var(--text_brand); color: #fff; }.history-empty { padding: 34px 10px; color: var(--text_tertiary); font-size: 13px; line-height: 1.7; text-align: center; }.history-empty small { font-size: 12px; }.session-list { display: flex; flex: 1; flex-direction: column; gap: 6px; overflow-y: auto; padding: 12px 0; }.session-row { display: grid; grid-template-columns: minmax(0, 1fr) 28px; align-items: center; border: 1px solid transparent; border-radius: 5px; }.session-row:hover, .session-row--active { border-color: var(--border_divider); background: var(--bg_brand_contain); }.session-item { width: 100%; border: 0; border-radius: 5px; padding: 10px; background: transparent; color: var(--text_primary); cursor: pointer; text-align: left; }.favorite-button { border: 0; background: none; color: #b78000; cursor: pointer; font-size: 17px; }.storage-summary { color: var(--text_tertiary); font-size: 11px; text-align: center; }.import-button { cursor: pointer; }.import-button--disabled { color: var(--text_disabled); cursor: not-allowed; opacity: .55; }.import-button input { display: none; }.session-title { display: block; overflow: hidden; font-size: 14px; font-weight: 700; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }.session-item small { display: block; margin-top: 4px; color: var(--text_tertiary); font-size: 12px; }.history-footer { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 12px; padding: 12px 4px 2px; border-top: 1px solid var(--border_divider); }.text-button--danger { color: var(--text_negative); }
.config-panel { padding: 18px 20px; overflow: hidden; } .section-heading { margin-bottom: 12px; }.section-heading p { margin-bottom: 0; }
.field-label { display: block; margin: 16px 0 6px; color: var(--text_secondary); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.field-input { width: 100%; border: 1px solid var(--border_form); border-radius: 6px; padding: 9px 10px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
.field-input:focus { border-color: var(--border_brand); box-shadow: 0 0 0 2px var(--bg_brand_tag); }.key-security-notice { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; padding: 9px 10px; border: 1px solid #f1d58a; border-radius: 6px; background: #fff8dc; color: #825a12; font-size: 12px; line-height: 1.5; }.key-security-notice .text-button { flex: 0 0 auto; color: #9a6500; }.field-input:disabled { cursor: not-allowed; opacity: .55; }.capability-notice { margin: 8px 0 0; padding: 8px 10px; border: 1px solid #f1d58a; border-radius: 6px; background: #fff8dc; color: #825a12; font-size: 11px; line-height: 1.5; }.field-hint { margin: 6px 0 0; color: var(--text_tertiary); font-size: 12px; }.url-presets { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: -22px; }.text-button { border: 0; padding: 0; background: none; color: var(--text_brand); font: inherit; font-size: 12px; cursor: pointer; }.text-button:hover { text-decoration: underline; }.text-button:disabled { color: var(--text_disabled); cursor: not-allowed; opacity: .55; text-decoration: none; }.text-button:focus-visible, .generate-button:focus-visible, .close-button:focus-visible, .reference-item button:focus-visible { outline: 2px solid var(--border_brand); outline-offset: 2px; }
.source-image-box { margin: 16px 0 2px; padding: 10px; border: 1px solid var(--border_brand); border-radius: 6px; background: var(--bg_brand_contain); }.source-image-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text_brand); font-size: 12px; font-weight: 700; }.source-image-box img { display: block; width: 100%; max-height: 160px; margin-top: 8px; border-radius: 4px; object-fit: contain; background: var(--bg_component); }.source-image-box p { margin: 7px 0 0; color: var(--text_secondary); font-size: 11px; line-height: 1.5; }.parameter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.custom-size-control { margin-top: 12px; padding: 12px; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_layout); }.custom-size-summary, .size-slider-field label { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.custom-size-summary { margin-bottom: 12px; color: var(--text_secondary); font-size: 12px; }.custom-size-summary strong, .size-slider-field strong { color: var(--text_primary); }.size-slider-field + .size-slider-field { margin-top: 10px; }.size-slider-field label { margin-bottom: 6px; color: var(--text_secondary); font-size: 12px; }.size-slider-field input { width: 100%; height: 18px; margin: 0; cursor: pointer; accent-color: var(--text_brand); }.custom-size-control p { margin: 8px 0 0; color: var(--text_tertiary); font-size: 11px; }.progress-box { margin-top: 16px; padding: 10px; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_brand_contain); }.progress-meta { display: flex; justify-content: space-between; gap: 10px; color: var(--text_secondary); font-size: 12px; }.progress-meta strong { color: var(--text_brand); }.progress-track { height: 6px; margin-top: 8px; overflow: hidden; border-radius: 6px; background: var(--bg_tag); }.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--text_brand); transition: width .45s ease; }.progress-box p { margin: 7px 0 0; color: var(--text_tertiary); font-size: 11px; line-height: 1.45; }.upload-zone { display: flex; min-height: 90px; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1px dashed var(--border_form); border-radius: 6px; color: var(--text_brand); cursor: pointer; font-size: 13px; }.upload-zone:hover { border-color: var(--border_brand); background: var(--bg_brand_contain); }.upload-zone small { color: var(--text_tertiary); }.upload-zone input { display: none; }.reference-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }.reference-item { position: relative; width: 64px; height: 64px; margin: 0; overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; }.reference-item img { width: 100%; height: 100%; object-fit: cover; }.reference-item button { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border: 0; border-radius: 50%; background: var(--bg_component); color: var(--text_primary); cursor: pointer; }.error-message { margin: 14px 0 0; color: var(--text_negative); font-size: 12px; }.generate-button { width: 100%; min-height: 40px; margin-top: 18px; border: 0; border-radius: 6px; background: var(--text_brand); color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; transition: opacity .15s, transform .15s; }.generate-button:hover { opacity: .9; }.generate-button:active { transform: scale(.98); }.generate-button:disabled { cursor: not-allowed; opacity: .45; }.spinner, .result-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; vertical-align: -2px; }.spinner { margin-right: 7px; }
.result-panel { display: flex; min-height: 0; flex-direction: column; padding: 18px; overflow: hidden; }.prompt-bar { display: grid; flex: 0 0 auto; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: end; padding-bottom: 12px; border-bottom: 1px solid var(--border_divider); }.prompt-editor { min-width: 0; }.prompt-bar-input { box-sizing: border-box; width: 100%; min-width: 0; height: 78px; min-height: 78px; max-height: 220px; resize: none; overflow-y: hidden; border: 1px solid var(--border_form); border-radius: 6px; padding: 10px 12px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 14px; line-height: 1.6; outline: none; transition: border-color .15s, box-shadow .15s; }.prompt-bar-input:focus { border-color: var(--border_brand); box-shadow: 0 0 0 2px var(--bg_brand_tag); }.prompt-tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 5px; color: var(--text_tertiary); font-size: 11px; }.prompt-tools div { display: flex; gap: 10px; }.prompt-tools button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font: inherit; font-size: 11px; }.prompt-tools button:hover { text-decoration: underline; }.prompt-bar .generate-button { width: auto; min-width: 84px; min-height: 40px; margin: 0 0 1px; padding: 0 18px; border: 0; border-radius: 6px; background: var(--text_brand); color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; transition: opacity .15s, transform .15s; }.stop-button { width: 84px; min-height: 40px; margin-bottom: 20px; border: 1px solid var(--text_negative); border-radius: 6px; background: var(--bg_component); color: var(--text_negative); cursor: pointer; font: inherit; font-size: 14px; font-weight: 700; }.template-launcher { position: relative; flex: 0 0 auto; padding: 8px 0; border-bottom: 1px solid var(--border_divider); }.template-toggle { display: flex; align-items: center; gap: 8px; border: 0; padding: 0; background: none; color: var(--text_secondary); cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; }.template-toggle::before { content: '＋'; display: grid; width: 18px; height: 18px; place-items: center; border: 1px solid var(--border_divider); border-radius: 5px; color: var(--text_brand); font-size: 13px; }.template-toggle small { color: var(--text_tertiary); font-size: 10px; font-weight: 400; }.template-workspace { padding-top: 9px; }.template-panel { display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 7px; }.template-card { position: relative; min-width: 0; overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_layout); }.template-apply, .template-add-card { display: flex; width: 100%; min-width: 0; flex-direction: column; gap: 2px; border: 0; padding: 9px; background: transparent; color: var(--text_primary); cursor: pointer; text-align: left; }.template-card:hover, .template-add-card:hover { border-color: var(--border_brand); background: var(--bg_brand_contain); }.template-panel strong { font-size: 11px; }.template-panel span { overflow: hidden; color: var(--text_tertiary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.template-card-actions { display: flex; gap: 9px; padding: 0 9px 7px; }.template-card-actions button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font-size: 9px; }.template-add-card { box-sizing: border-box; min-height: 58px; border: 1px dashed var(--border_form); border-radius: 6px; justify-content: center; color: var(--text_brand); }.template-editor { display: grid; grid-template-columns: minmax(120px, .55fr) minmax(160px, .8fr) minmax(220px, 1.5fr); gap: 8px; margin-top: 8px; padding: 10px; border: 1px solid var(--border_brand); border-radius: 6px; background: var(--bg_brand_contain); }.template-editor > div, .template-editor footer { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; }.template-editor > div button { border: 0; background: none; cursor: pointer; font-size: 18px; }.template-editor input, .template-editor textarea { box-sizing: border-box; width: 100%; border: 1px solid var(--border_form); border-radius: 5px; padding: 7px 8px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 11px; resize: vertical; }.template-editor footer small { color: var(--text_tertiary); }.template-editor footer button { border: 0; border-radius: 5px; padding: 6px 10px; background: var(--text_brand); color: #fff; cursor: pointer; font-size: 11px; }.result-header-actions { display: flex; gap: 14px; }.prompt-bar .generate-button:hover { opacity: .9; }.prompt-bar .generate-button:active { transform: scale(.97); }.prompt-bar .generate-button:disabled { cursor: not-allowed; opacity: .45; }.prompt-bar-meta { flex: 0 0 auto; padding-top: 8px; }.prompt-bar-meta .progress-box { margin-top: 0; }.prompt-bar-meta .progress-box p { display: none; }.result-header { display: flex; flex: 0 0 auto; align-items: flex-start; justify-content: space-between; padding: 12px 0 12px; border-bottom: 1px solid var(--border_divider); }.result-header p { margin-bottom: 0; }.round-list { min-height: 0; flex: 1; overflow: auto; padding-top: 12px; }.round-group + .round-group { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border_divider); }.round-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.round-header div { display: flex; align-items: baseline; gap: 10px; }.round-header span { color: var(--text_tertiary); font-size: 11px; }.round-prompt { max-width: 850px; margin: 6px 0 0; overflow: hidden; color: var(--text_secondary); font-size: 12px; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }.creation-chain { display: grid; grid-template-columns: minmax(120px, 20%) 24px minmax(180px, 28%) 24px minmax(260px, 1fr); align-items: center; gap: 8px; margin-top: 10px; padding: 12px; border: 1px solid var(--border_divider); border-radius: 8px; background: var(--bg_layout); }.chain-source, .chain-prompt, .chain-results { min-width: 0; }.chain-source { display: flex; flex-direction: column; align-items: flex-start; }.chain-kicker { margin-bottom: 7px; color: var(--text_tertiary); font-size: 10px; font-weight: 700; letter-spacing: .05em; }.chain-image { width: 100%; height: 116px; overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; padding: 0; background: var(--bg_component); cursor: zoom-in; }.chain-image img { width: 100%; height: 100%; object-fit: contain; }.chain-source strong { margin-top: 7px; overflow: hidden; max-width: 100%; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.chain-source small { margin-top: 3px; color: var(--text_tertiary); font-size: 10px; }.chain-action { margin-top: 7px; border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font-size: 11px; }.chain-arrow { color: var(--text_tertiary); font-size: 18px; text-align: center; }.chain-prompt { padding: 11px; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_component); }.chain-tags { display: flex; flex-wrap: wrap; gap: 5px; }.chain-tags span { border-radius: 4px; padding: 3px 6px; background: var(--bg_brand_contain); color: var(--text_brand); font-size: 10px; }.chain-prompt p { display: -webkit-box; margin: 9px 0; overflow: hidden; color: var(--text_primary); font-size: 12px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }.chain-prompt div:last-child { display: flex; flex-wrap: wrap; gap: 10px; }.chain-prompt button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font-size: 10px; }.chain-results .image-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); padding-top: 0; overflow: visible; }.chain-results .image-grid--1 { grid-template-columns: minmax(0, 1fr); }.chain-results .image-grid--1 .image-card { width: 100%; }.chain-results .image-thumb img { max-height: 150px; }.result-state { display: flex; min-height: 0; flex: 1; flex-direction: column; align-items: center; justify-content: center; text-align: center; }.result-state strong { font-size: 15px; }.result-state p { max-width: 360px; margin: 8px 0 0; }.result-spinner { width: 22px; height: 22px; margin-bottom: 12px; color: var(--text_brand); }.image-grid { display: grid; min-height: 0; flex: 1; gap: 12px; padding-top: 14px; overflow: auto; align-content: start; }.image-grid--1 { grid-template-columns: minmax(0, 1fr); justify-items: center; }.image-grid--1 .image-card { width: min(100%, 520px); }.image-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }.image-grid--3, .image-grid--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }.image-card { position: relative; overflow: hidden; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_layout); }.image-card--checked { border-color: var(--border_brand); }.image-card--favorite { box-shadow: inset 0 0 0 2px #e6b83f; }.select-image-button, .favorite-image-button { position: absolute; z-index: 12; top: 7px; border: 0; border-radius: 4px; padding: 3px 6px; background: rgba(0,0,0,.62); color: #fff; cursor: pointer; font-size: 10px; }.select-image-button { left: 7px; }.favorite-image-button { right: 7px; font-size: 14px; }.image-fit-cover { object-fit: cover !important; }.image-card--selected { border-color: var(--border_brand); box-shadow: 0 0 0 2px var(--bg_brand_tag); }.image-thumb { position: relative; cursor: zoom-in; }.image-thumb img { display: block; width: 100%; max-height: 240px; aspect-ratio: auto; object-fit: contain; background: var(--bg_contain); }.image-thumb:hover .zoom-hint { opacity: 1; }.zoom-hint { position: absolute; bottom: 6px; right: 6px; padding: 2px 7px; border-radius: 4px; background: rgba(0,0,0,.55); color: #fff; font-size: 10px; opacity: 0; transition: opacity .2s; pointer-events: none; }.prompt-tooltip { position: absolute; left: 10px; right: 10px; bottom: 10px; max-height: 140px; overflow-y: auto; padding: 9px 11px; border-radius: 6px; background: rgba(0,0,0,.82); color: #fff; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; opacity: 0; visibility: hidden; transition: opacity .2s, visibility .2s; pointer-events: none; z-index: 10; }.image-thumb:hover .prompt-tooltip { opacity: 1; visibility: visible; }.image-card footer { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; color: var(--text_secondary); font-size: 12px; }.image-actions { display: flex; gap: 10px; align-items: center; }.image-actions button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font: inherit; font-size: 12px; }.image-actions button:hover { text-decoration: underline; }.image-actions--active { color: var(--text_tertiary) !important; cursor: default !important; text-decoration: none !important; }.image-card a { color: var(--text_brand); text-decoration: none; }.image-card a:hover { text-decoration: underline; }.batch-actions { position: sticky; z-index: 20; bottom: 0; display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; padding: 10px; border: 1px solid var(--border_divider); border-radius: 6px; background: var(--bg_component); box-shadow: 0 -4px 16px rgba(0,0,0,.08); font-size: 12px; }.batch-actions button { border: 1px solid var(--border_form); border-radius: 5px; padding: 5px 9px; background: var(--bg_component); color: var(--text_brand); cursor: pointer; }.preview-overlay { position: fixed; z-index: 400; inset: 0; display: flex; align-items: center; justify-content: center; padding: 36px; background: rgba(0, 0, 0, .75); }.preview-overlay img { max-width: 100%; max-height: 100%; object-fit: contain; }.compare-grid { display: grid; max-width: 94vw; max-height: 90vh; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; overflow: auto; }.compare-grid img { width: 100%; height: 42vh; object-fit: contain; background: #111; }.analysis-bubble { position: fixed; z-index: 360; display: flex; width: min(500px, calc(100vw - 24px)); height: min(600px, 72vh); flex-direction: column; overflow: hidden; border: 1px solid var(--border_brand); border-radius: 10px; background: var(--bg_component); box-shadow: 0 16px 48px rgba(0,0,0,.22); }.analysis-bubble--minimized { height: 58px; }.analysis-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; padding: 8px 10px; border-bottom: 1px solid var(--border_divider); background: var(--bg_brand_contain); cursor: move; user-select: none; }.analysis-header > div { display: flex; min-width: 0; align-items: center; gap: 9px; }.analysis-header img { width: 40px; height: 40px; border-radius: 5px; object-fit: cover; background: var(--bg_contain); }.analysis-header span { display: flex; min-width: 0; flex-direction: column; }.analysis-header strong { font-size: 13px; }.analysis-header small { overflow: hidden; max-width: 210px; color: var(--text_tertiary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.analysis-header nav { display: flex; align-items: center; gap: 7px; }.analysis-header nav button { border: 0; padding: 3px 5px; background: none; color: var(--text_secondary); cursor: pointer; font-size: 11px; }.analysis-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 11px 7px; }.analysis-controls select { border: 1px solid var(--border_form); border-radius: 5px; padding: 5px 7px; background: var(--bg_component); color: var(--text_primary); font-size: 11px; }.analysis-controls span { color: var(--text_tertiary); font-size: 10px; }.analysis-presets { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 11px 9px; border-bottom: 1px solid var(--border_divider); }.analysis-presets button { border: 1px solid var(--border_divider); border-radius: 999px; padding: 4px 8px; background: var(--bg_layout); color: var(--text_brand); cursor: pointer; font-size: 10px; }.analysis-presets button:disabled { cursor: not-allowed; opacity: .45; }.analysis-conversation { min-height: 0; flex: 1; overflow-y: auto; padding: 12px; background: var(--bg_layout); }.analysis-empty { padding: 42px 18px; color: var(--text_secondary); text-align: center; }.analysis-empty p { margin: 6px 0 0; font-size: 11px; }.analysis-message + .analysis-message { margin-top: 13px; }.analysis-message > strong { display: block; margin-bottom: 4px; color: var(--text_secondary); font-size: 10px; }.analysis-message p { margin: 0; border-radius: 7px; padding: 9px 10px; background: var(--bg_component); color: var(--text_primary); font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }.analysis-message--user p { background: var(--bg_brand_contain); }.stream-caret { display: inline-block; width: 5px; height: 13px; margin-left: 3px; background: var(--text_brand); animation: blink .8s steps(1) infinite; vertical-align: -2px; }.analysis-answer-actions { display: flex; flex-wrap: wrap; gap: 9px; padding: 5px 2px 0; }.analysis-answer-actions button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font-size: 9px; }.edit-prompt-card { margin-top: 8px; padding: 9px; border: 1px solid var(--border_brand); border-radius: 7px; background: var(--bg_brand_contain); }.edit-prompt-card header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }.edit-prompt-card header strong { color: var(--text_brand); font-size: 11px; }.edit-prompt-card header span { color: var(--text_tertiary); font-size: 9px; }.edit-prompt-card textarea { box-sizing: border-box; width: 100%; min-height: 106px; resize: vertical; border: 1px solid var(--border_form); border-radius: 5px; padding: 8px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 11px; line-height: 1.55; }.edit-prompt-card footer { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 7px; }.edit-prompt-card footer button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font-size: 9px; }.edit-prompt-card footer button:nth-child(3) { font-weight: 700; }.analysis-error { margin: 0; padding: 6px 11px; background: #fff0f0; color: var(--text_negative); font-size: 10px; }.analysis-composer { display: grid; flex: 0 0 auto; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 9px 11px; border-top: 1px solid var(--border_divider); }.analysis-composer textarea { min-height: 54px; resize: none; border: 1px solid var(--border_form); border-radius: 6px; padding: 7px 8px; background: var(--bg_component); color: var(--text_primary); font: inherit; font-size: 11px; }.analysis-composer > div { display: flex; flex-direction: column; justify-content: flex-end; gap: 5px; }.analysis-composer button { border: 0; border-radius: 5px; padding: 6px 9px; background: var(--text_brand); color: #fff; cursor: pointer; font-size: 10px; }.analysis-composer button:disabled { opacity: .45; cursor: not-allowed; }.analysis-composer .analysis-stop { background: var(--text_negative); }.analysis-footer { display: flex; align-items: center; justify-content: space-between; padding: 0 11px 8px; color: var(--text_tertiary); font-size: 9px; }.analysis-footer button { border: 0; padding: 0; background: none; color: var(--text_brand); cursor: pointer; font-size: 9px; }.chain-source-actions { display: flex; gap: 10px; }.settings-drawer { position: fixed; z-index: 500; top: 0; right: 0; width: min(360px, 92vw); height: 100dvh; box-sizing: border-box; padding: 20px; overflow-y: auto; border-left: 1px solid var(--border_divider); background: var(--bg_component); box-shadow: -10px 0 30px rgba(0,0,0,.12); }.settings-drawer header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }.settings-drawer header button { border: 0; background: none; cursor: pointer; font-size: 24px; }.settings-drawer label { display: block; margin-top: 16px; color: var(--text_secondary); font-size: 12px; }.check-row { display: flex !important; align-items: center; gap: 8px; }.apply-preferences { width: 100%; margin-top: 24px; border: 0; border-radius: 6px; padding: 10px; background: var(--text_brand); color: #fff; cursor: pointer; font-weight: 700; }.close-button { position: fixed; top: 16px; right: 18px; width: 38px; height: 38px; border: 0; border-radius: 6px; background: var(--bg_component); color: var(--text_primary); cursor: pointer; font-size: 24px; }
@keyframes spin { to { transform: rotate(360deg); } }@keyframes blink { 50% { opacity: 0; } }
@media (max-width: 1060px) { .studio-shell { overflow: auto; }.topbar { grid-template-columns: 1fr auto; gap: 12px; }.primary-tabs { grid-column: 1 / -1; grid-row: 2; justify-self: start; }.workspace { flex: none; grid-template-columns: minmax(190px, 240px) minmax(300px, 1fr); }.result-panel { grid-column: 1 / -1; min-height: 520px; }.history-panel, .config-panel { min-height: 620px; }.template-panel { grid-template-columns: repeat(3, minmax(110px, 1fr)); }.creation-chain { grid-template-columns: minmax(120px, .8fr) 20px minmax(180px, 1fr); }.chain-results { grid-column: 1 / -1; }.creation-chain > .chain-arrow:last-of-type { display: none; } }@media (max-width: 700px) { .studio-shell { padding: 14px; }.topbar { gap: 12px; }.security-note { display: none; }.workspace { display: flex; flex-direction: column; }.history-panel, .config-panel, .result-panel { min-height: auto; }.history-panel { max-height: 260px; }.config-panel { overflow: visible; }.result-panel { min-height: 460px; }.prompt-bar { grid-template-columns: 1fr; }.prompt-bar-input { min-height: 78px; }.prompt-bar .generate-button { width: 100%; }.template-panel { grid-template-columns: 1fr 1fr; }.creation-chain { display: flex; flex-direction: column; align-items: stretch; }.chain-arrow { transform: rotate(90deg); }.chain-image { height: 180px; }.image-grid--1 .image-card { width: 100%; }.image-thumb img { max-height: none; }.analysis-bubble { inset: auto 8px 8px 8px !important; width: auto; height: min(72vh, 620px); border-radius: 10px 10px 0 0; }.analysis-header { cursor: default; } }@media (max-width: 560px) { .image-grid--2, .image-grid--3, .image-grid--4 { grid-template-columns: 1fr; } }
</style>
