/**
 * @ks-data/composables - useCurrentUser
 *
 * 当前登录用户状态 + 访问权限校验（全局单例）
 *
 * 模块级 ref => 任意组件 useCurrentUser() 拿到的是同一份状态，
 * load() 全程只真正校验一次（含 SSO 跳转），避免重复请求。
 * 登录成功后自动调用 getAuth() 校验访问权限，auth=false 表示无权限。
 */
import { ref } from 'vue';
import { ensureLogin, getAuth } from '@ks-data/utils';

const user = ref<any>(null);
const loading = ref(false);
const error = ref('');
const auth = ref<boolean | null>(null);
const owner = ref<string | undefined>(undefined);
const applyUrl = ref<string | undefined>(undefined);
let started = false;

export function useCurrentUser() {
    async function checkAuth() {
        try {
            const res = await getAuth();
            auth.value = res?.auth !== false;
            owner.value = res?.createdBy || undefined;
            applyUrl.value = res?.applyUrl || undefined;
        } catch {
            auth.value = false;
        } finally {
            loading.value = false;
        }
    }

    async function load() {
        if (started || user.value) return;
        started = true;
        loading.value = true;
        error.value = '';
        try {
            user.value = await ensureLogin();
            checkAuth();
        } catch (e: any) {
            error.value = e?.message || String(e);
            started = false;
            loading.value = false;
        }
    }

    return { user, loading, error, auth, owner, applyUrl, load };
}
