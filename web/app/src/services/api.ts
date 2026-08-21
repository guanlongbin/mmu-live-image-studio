export type ImageModelId =
    | 'gemini-3-1-flash-lite-image'
    | 'gemini-3-1-flash-image'
    | 'gpt-image-2';

export interface ReferenceImageInput {
    mimeType: string;
    base64: string;
}

export interface GenerateImageProgress {
    completed: number;
    failed: number;
    total: number;
}

export interface GenerateImageParams {
    apiKey: string;
    baseUrl: string;
    model: ImageModelId;
    prompt: string;
    size: string;
    count: number;
    referenceImages: ReferenceImageInput[];
    signal?: AbortSignal;
    onProgress?: (progress: GenerateImageProgress) => void;
}

export interface GeneratedImage {
    id: string;
    dataUrl: string;
}

export interface GenerateImageResult {
    images: GeneratedImage[];
    failed: number;
}

export type VisionModelId = 'gpt-5-6-terra' | 'gpt-5-6-sol' | 'gpt-5-6-luna';
export interface VisionMessage { role: 'user' | 'assistant'; content: string }
export interface AnalyzeImageParams {
    apiKey: string;
    baseUrl: string;
    model: VisionModelId;
    imageDataUrl: string;
    messages: VisionMessage[];
    originalPrompt?: string;
    signal?: AbortSignal;
    onDelta: (text: string) => void;
}

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.trim().replace(/\/+$/, '');
}

function resolveEndpoint(baseUrl: string, model: ImageModelId, editing = false) {
    const origin = normalizeBaseUrl(baseUrl).replace(/\/(v1|v1beta)$/, '');
    if (model.startsWith('gemini-')) {
        return `${origin}/v1beta/models/${model}:generateContent`;
    }
    return `${origin}/v1/images/${editing ? 'edits' : 'generations'}`;
}

function toDataUrl(base64: string, mimeType = 'image/png') {
    return `data:${mimeType};base64,${base64}`;
}

function referenceToFile(image: ReferenceImageInput, index: number) {
    const binary = window.atob(image.base64);
    const bytes = new Uint8Array(binary.length);
    for (let offset = 0; offset < binary.length; offset += 1) bytes[offset] = binary.charCodeAt(offset);
    const extension = image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    return new File([bytes], `reference-${index + 1}.${extension}`, { type: image.mimeType });
}

function resolveAspectRatio(size: string) {
    const [width, height] = size.split('x').map(Number);
    if (!width || !height) return '1:1';
    const divisor = (a: number, b: number): number => b ? divisor(b, a % b) : a;
    const factor = divisor(width, height);
    return `${width / factor}:${height / factor}`;
}

function readGeminiImages(payload: any): GeneratedImage[] {
    const images: GeneratedImage[] = [];
    for (const candidate of payload?.candidates ?? []) {
        for (const part of candidate?.content?.parts ?? []) {
            const inlineData = part?.inlineData;
            if (inlineData?.data) {
                images.push({
                    id: crypto.randomUUID(),
                    dataUrl: toDataUrl(inlineData.data, inlineData.mimeType || 'image/png'),
                });
            }
        }
    }
    return images;
}

function readOpenAiImages(payload: any): GeneratedImage[] {
    return (payload?.data ?? [])
        .filter((item: any) => item?.b64_json)
        .map((item: any) => ({
            id: crypto.randomUUID(),
            dataUrl: toDataUrl(item.b64_json),
        }));
}

/**
 * 图片接口需将用户运行时 API Key 直接带给用户指定的 TokenVerse 地址，
 * 因此不能使用站点通用 request 封装。此函数不写入任何浏览器持久化存储。
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const isGemini = params.model.startsWith('gemini-');
    const isOpenAiEdit = !isGemini && params.referenceImages.length > 0;
    const endpoint = resolveEndpoint(params.baseUrl, params.model, isOpenAiEdit);

    const geminiParts = [
        { text: params.prompt },
        ...params.referenceImages.map((image) => ({
            inlineData: { mimeType: image.mimeType, data: image.base64 },
        })),
    ];

    const payload = isGemini
        ? {
              contents: [{ role: 'user', parts: geminiParts }],
              generationConfig: {
                  responseModalities: ['IMAGE'],
                  imageConfig: { aspectRatio: resolveAspectRatio(params.size) },
              },
          }
        : {
              model: params.model,
              prompt: params.prompt,
              n: params.count,
              size: params.size,
              response_format: 'b64_json',
          };

    const requestOnce = async () => {
        const formData = new FormData();
        if (isOpenAiEdit) {
            formData.append('model', params.model);
            formData.append('prompt', params.prompt);
            formData.append('n', String(params.count));
            formData.append('size', params.size);
            formData.append('response_format', 'b64_json');
            formData.append('image', referenceToFile(params.referenceImages[0], 0));
        }
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: isOpenAiEdit
                ? { Authorization: `Bearer ${params.apiKey}` }
                : { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
            body: isOpenAiEdit ? formData : JSON.stringify(payload),
            signal: params.signal,
        });
        const payloadData = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detail = payloadData?.error?.message || payloadData?.message || `HTTP ${response.status}`;
            throw new Error(`生成请求失败：${detail}`);
        }
        return isGemini ? readGeminiImages(payloadData) : readOpenAiImages(payloadData);
    };

    if (!isGemini) {
        const images = await requestOnce();
        params.onProgress?.({ completed: images.length, failed: 0, total: params.count });
        if (!images.length) throw new Error('接口已返回，但未解析到图片。请检查模型权限或服务地址。');
        return { images, failed: Math.max(0, params.count - images.length) };
    }

    let completed = 0;
    let failed = 0;
    const failures: string[] = [];
    const trackedRequests = Array.from({ length: params.count }, async () => {
        try {
            const images = await requestOnce();
            completed += images.length;
            params.onProgress?.({ completed, failed, total: params.count });
            return images;
        } catch (error: any) {
            if (error?.name === 'AbortError') throw error;
            failed += 1;
            const detail = error instanceof Error ? error.message : String(error);
            if (detail && !failures.includes(detail)) failures.push(detail);
            params.onProgress?.({ completed, failed, total: params.count });
            return [];
        }
    });
    const images = (await Promise.all(trackedRequests)).flat();
    if (!images.length) {
        const detail = failures[0] || '浏览器未获得可用响应。';
        throw new Error(`所有生成请求均失败：${detail}`);
    }
    return { images, failed };
}

export async function analyzeImageStream(params: AnalyzeImageParams) {
    const origin = normalizeBaseUrl(params.baseUrl).replace(/\/(v1|v1beta)$/, '');
    const firstUserIndex = params.messages.findIndex((message) => message.role === 'user');
    const messages = params.messages.map((message, index) => index === firstUserIndex
        ? {
              role: message.role,
              content: [
                  { type: 'text', text: params.originalPrompt ? `这张图片原来的生成 Prompt 是：\n${params.originalPrompt}\n\n请结合原始创作意图回答，不要提出与其冲突的无关改造。\n\n用户问题：\n${message.content}` : message.content },
                  { type: 'image_url', image_url: { url: params.imageDataUrl } },
              ],
          }
        : message);
    const response = await fetch(`${origin}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: params.model, messages, stream: true }),
        signal: params.signal,
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
    }
    if (!response.body) throw new Error('服务未返回可读取的流式响应。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            const data = line.trim().replace(/^data:\s*/, '');
            if (!data || data === '[DONE]') continue;
            try {
                const chunk = JSON.parse(data);
                const delta = chunk?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') params.onDelta(delta);
            } catch { /* wait for the next complete SSE frame */ }
        }
    }
}
