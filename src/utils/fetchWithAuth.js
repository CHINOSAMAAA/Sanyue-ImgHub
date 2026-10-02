import store from '@/store'
import router from '@/router'

let isRedirecting = false;

export default async function fetchWithAuth(url, options = {}) {
    // 开发环境下添加 /api 前缀
    url = process.env.NODE_ENV === 'production' ? url : `/api${url}`;

    // 确保包含凭据（HttpOnly Cookie 会自动携带）
    options.credentials = 'include';

    options.headers = {
        ...options.headers,
    };

    const response = await fetch(url, options);

    if (response.status === 401 && !isRedirecting) {
        isRedirecting = true;
        const isAdminView = store.getters.isAdminView;
        if (isAdminView) {
            store.commit('setAdminLoggedIn', false);
        }
        store.commit('setUserLoggedIn', false);
        const target = isAdminView ? '/adminLogin' : '/login';
        router.push(target).finally(() => {
            isRedirecting = false;
        });
    }

    return response;
}
