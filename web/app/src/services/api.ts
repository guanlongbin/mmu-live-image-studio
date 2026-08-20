export type ImageModelId =
    | 'gemini-3-1-flash-lite-image'
    | 'gemini-3-1-flash-image'
    | 'gpt-image-2';

export interface ReferenceImageInput {
    mimeType: string;
    base64: string;
}

export interface GenerateImageParams {
    apiKey: string;
    baseUrl: string;
    model: ImageModelId;
    prompt: string;
    size: string;
    count: number;
    referenceImages: ReferenceImageInput[];
}

export interface GeneratedImage {
    id: string;
    dataUrl: string;
}

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.trim().replace(/\/+$/, '');
}

function resolveEndpoint(baseUrl: string, model: ImageModelId) {
    const origin = normalizeBaseUrl(baseUrl).replace(/\/(v1|v1beta)$/, '');
    if (model.startsWith('gemini-')) {
        return `${origin}/v1beta/models/${model}:generateContent`;
    }
    return `${origin}/v1/images/generations`;
}

function toDataUrl(base64: string, mimeType = 'image/png') {
    return `data:${mimeType};base64,${base64}`;
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
export async function generateImage(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const isGemini = params.model.startsWith('gemini-');
    const endpoint = resolveEndpoint(params.baseUrl, params.model);

    const geminiParts = [
        { text: params.prompt },
        ...params.referenceImages.map((image) => ({
            inlineData: { mimeType: image.mimeType, data: image.base64 },
        })),
    ];

    const payload = isGemini
        ? {
              contents: [{ role: 'user', parts: geminiParts }],
              generationConfig: { responseModalities: ['IMAGE'] },
          }
        : {
              model: params.model,
              prompt: params.prompt,
              n: params.count,
              size: params.size,
              response_format: 'b64_json',
          };

    const requestOnce = async () => {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${params.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const payloadData = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detail = payloadData?.error?.message || payloadData?.message || `HTTP ${response.status}`;
            throw new Error(`生成请求失败：${detail}`);
        }
        return isGemini ? readGeminiImages(payloadData) : readOpenAiImages(payloadData);
    };

    const responses = isGemini
        ? await Promise.all(Array.from({ length: params.count }, requestOnce))
        : [await requestOnce()];
    const images = responses.flat();
    if (!images.length) {
        throw new Error('接口已返回，但未解析到图片。请检查模型权限或服务地址。');
    }
    return images;
}
