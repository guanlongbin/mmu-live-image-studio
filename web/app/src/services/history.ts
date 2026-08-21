import type { GeneratedImage, ImageModelId } from './api';

export interface ImageGenerationRound {
    id: string;
    createdAt: number;
    prompt: string;
    model: ImageModelId;
    size: string;
    count: number;
    sourceImageId?: string;
    sourceImageDataUrl?: string;
    sourceRoundId?: string;
    sourceLabel?: string;
    sourceType?: 'generated' | 'upload';
    extraReferenceCount?: number;
    images: GeneratedImage[];
}

export interface ImageGenerationSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    prompt: string;
    model: ImageModelId;
    size: string;
    count: number;
    images: GeneratedImage[];
    rounds?: ImageGenerationRound[];
    favorite?: boolean;
    favoriteImageIds?: string[];
}

const databaseName = 'mmu-live-image-studio';
const databaseVersion = 1;
const storeName = 'generation-sessions';

function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = window.indexedDB.open(databaseName, databaseVersion);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(storeName)) {
                const store = database.createObjectStore(storeName, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('无法打开本地历史记录。'));
    });
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
    const database = await openDatabase();
    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const request = callback(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('本地历史记录操作失败。'));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
    });
}

export async function listSessions() {
    const sessions = await withStore<ImageGenerationSession[]>('readonly', (store) => store.getAll());
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveSession(session: ImageGenerationSession) {
    await withStore<IDBValidKey>('readwrite', (store) => store.put(session));
}

export async function deleteSession(id: string) {
    await withStore<undefined>('readwrite', (store) => store.delete(id));
}

export async function clearSessions() {
    await withStore<undefined>('readwrite', (store) => store.clear());
}
