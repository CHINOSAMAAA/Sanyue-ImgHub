<template>
    <BaseLogin
        v-if="authModeReady"
        :title="loginTitle"
        :fields="loginFields"
        :submit-text="$t('login.submit')"
        background-key="loginBkImg"
        :is-admin="false"
        :loading="isLoading"
        @submit="handleLogin"
    />
</template>

<script>
import axios from '@/utils/axios'
import { mapGetters } from 'vuex'
import BaseLogin from '@/components/BaseLogin.vue'

export default {
    data() {
        return {
            isLoading: false,
            accountAuth: false,
            authModeReady: false,
            loginFields: []
        }
    },
    computed: {
        ...mapGetters(['userConfig']),
        ownerName() {
            return this.userConfig?.ownerName || 'Sanyue'
        },
        loginTitle() {
            return this.$t('login.title', { owner: this.ownerName })
        }
    },
    components: {
        BaseLogin
    },
    created() {
        this.updateLoginFields();
        this.loadAuthMode();
    },
    watch: {
        '$i18n.locale'() {
            this.updateLoginFields();
        }
    },
    methods: {
        async loadAuthMode() {
            try {
                const res = await axios.get('/api/auth/sessionCheck', { withCredentials: true });
                const data = res.data || {};
                this.$store.commit('setAuthSession', data);
                this.accountAuth = !!data.accountAuth;
                if (data.valid) {
                    this.$store.commit('setUserLoggedIn', true);
                    this.$router.replace(data.authType === 'admin' ? '/dashboard' : '/');
                    return;
                }
            } catch {
                this.accountAuth = false;
            }
            this.updateLoginFields();
            this.authModeReady = true;
        },
        updateLoginFields() {
            const fields = [];
            if (this.accountAuth) {
                fields.push({
                    key: 'username',
                    label: this.$t('login.username'),
                    placeholder: this.$t('login.usernamePlaceholder'),
                    type: 'text',
                    icon: 'User'
                });
            }
            fields.push({
                key: 'password',
                label: this.$t('login.password'),
                placeholder: this.accountAuth ? this.$t('login.adminPasswordPlaceholder') : this.$t('login.passwordPlaceholder'),
                type: 'password',
                showPassword: true,
                icon: 'Lock'
            });
            this.loginFields = fields;
        },
        async handleLogin(formData) {
            const { username, password } = formData;
            
            this.isLoading = true;
            
            const minDelayPromise = new Promise(resolve => setTimeout(resolve, 500));
            const payload = this.accountAuth
                ? { username, password }
                : { authCode: password, password };
            const loginPromise = axios.post('/api/auth/login', payload, {
                withCredentials: true
            }).then(res => ({ res })).catch(err => ({ err }));

            try {
                const [result] = await Promise.all([loginPromise, minDelayPromise]);
                
                if (result.res && result.res.status === 200) {
                    const data = result.res.data || {};
                    this.$store.commit('setUserLoggedIn', true);
                    this.$store.commit('setAuthSession', {
                        ...this.$store.state.authSession,
                        valid: true,
                        authType: data.authType || 'user',
                        username: data.username || username || '',
                        displayName: data.displayName || data.username || '',
                        permissions: data.permissions || [],
                        accountAuth: this.accountAuth,
                    });
                    this.$router.push('/')
                    this.$message.success(this.$t('login.success'))
                } else {
                    this.isLoading = false;
                    this.$message.error(this.$t('login.failed'))
                }
            } catch (err) {
                this.isLoading = false;
                this.$message.error(this.$t('login.systemError'))
            }
        }
    }
}
</script>

<style scoped>
</style>
