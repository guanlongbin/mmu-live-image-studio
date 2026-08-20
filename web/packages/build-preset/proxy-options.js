export function createProxyOptions({ target, cookie, agent }) {
    return {
        target,
        changeOrigin: true,
        agent,
        cookieDomainRewrite: '',
        ...(cookie ? { headers: { Cookie: cookie } } : {}),
    };
}
