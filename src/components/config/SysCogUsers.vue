<template>
    <div class="user-settings" v-loading="loading">
        <div class="first-settings">
            <h3 class="first-title">
                {{ $t('sysUsers.title') }}
                <el-button type="primary" size="small" circle @click="openCreate">
                    <font-awesome-icon icon="plus"/>
                </el-button>
            </h3>
            <p class="user-hint">{{ $t('sysUsers.hint') }}</p>
            <div class="token-table-container">
                <el-table :data="users" class="token-table">
                    <el-table-column prop="username" :label="$t('sysUsers.username')" min-width="120"/>
                    <el-table-column prop="displayName" :label="$t('sysUsers.displayName')" min-width="120"/>
                    <el-table-column :label="$t('sysUsers.permissions')" min-width="220">
                        <template #default="scope">
                            <el-tag
                                v-for="perm in scope.row.permissions"
                                :key="perm"
                                size="small"
                                class="permission-tag"
                            >
                                {{ permissionLabel(perm) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column :label="$t('sysUsers.status')" width="100" align="center">
                        <template #default="scope">
                            <el-tag :type="scope.row.enabled !== false ? 'success' : 'info'" size="small">
                                {{ scope.row.enabled !== false ? $t('sysUsers.enabled') : $t('sysUsers.disabled') }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column :label="$t('sysUsers.operation')" width="180" align="center" fixed="right">
                        <template #default="scope">
                            <el-button class="action-button" size="small" @click="openEdit(scope.row)">{{ $t('sysUsers.edit') }}</el-button>
                            <el-button class="action-button" size="small" type="danger" @click="removeUser(scope.row)">{{ $t('sysUsers.delete') }}</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </div>

        <el-dialog
            v-model="dialogVisible"
            :title="editingUser ? $t('sysUsers.editTitle') : $t('sysUsers.createTitle')"
            :width="dialogWidth"
            destroy-on-close
        >
            <el-form :model="form" :rules="rules" ref="formRef" label-width="108px">
                <el-form-item :label="$t('sysUsers.username')" prop="username">
                    <el-input v-model="form.username" autocomplete="off"/>
                </el-form-item>
                <el-form-item :label="$t('sysUsers.displayName')" prop="displayName">
                    <el-input v-model="form.displayName" autocomplete="off"/>
                </el-form-item>
                <el-form-item :label="$t('sysUsers.password')" prop="password">
                    <el-input
                        v-model="form.password"
                        type="password"
                        show-password
                        autocomplete="new-password"
                        :placeholder="editingUser ? $t('sysUsers.passwordKeep') : ''"
                    />
                </el-form-item>
                <el-form-item :label="$t('sysUsers.permissions')" prop="permissions">
                    <el-checkbox-group v-model="form.permissions">
                        <el-checkbox v-for="perm in availablePermissions" :key="perm" :label="perm">
                            {{ permissionLabel(perm) }}
                        </el-checkbox>
                    </el-checkbox-group>
                </el-form-item>
                <el-form-item :label="$t('sysUsers.enabled')">
                    <el-switch v-model="form.enabled"/>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">{{ $t('sysUsers.cancel') }}</el-button>
                <el-button type="primary" :loading="saving" @click="submitForm">{{ $t('sysUsers.save') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script>
import fetchWithAuth from '@/utils/fetchWithAuth';

const DEFAULT_PERMISSIONS = ['upload', 'list', 'delete', 'manage'];

export default {
    name: 'SysCogUsers',
    data() {
        return {
            loading: false,
            saving: false,
            users: [],
            availablePermissions: [...DEFAULT_PERMISSIONS],
            dialogVisible: false,
            editingUser: null,
            form: this.emptyForm(),
        };
    },
    computed: {
        dialogWidth() {
            return window.innerWidth > 768 ? '480px' : '92%';
        },
        rules() {
            return {
                username: [
                    { required: true, message: this.$t('sysUsers.usernameRequired'), trigger: 'blur' },
                    { min: 3, max: 32, message: this.$t('sysUsers.usernameRule'), trigger: 'blur' },
                    { pattern: /^[a-zA-Z0-9_.-]+$/, message: this.$t('sysUsers.usernameRule'), trigger: 'blur' },
                ],
                password: [
                    {
                        validator: (rule, value, callback) => {
                            if (!this.editingUser && !value) {
                                callback(new Error(this.$t('sysUsers.passwordRequired')));
                                return;
                            }
                            if (value && String(value).length < 4) {
                                callback(new Error(this.$t('sysUsers.passwordRule')));
                                return;
                            }
                            callback();
                        },
                        trigger: 'blur',
                    },
                ],
            };
        },
    },
    methods: {
        emptyForm() {
            return {
                username: '',
                displayName: '',
                password: '',
                enabled: true,
                permissions: [...DEFAULT_PERMISSIONS],
            };
        },
        permissionLabel(perm) {
            const map = {
                upload: this.$t('sysSecurity.permUpload'),
                delete: this.$t('sysSecurity.permDelete'),
                list: this.$t('sysSecurity.permList'),
                manage: this.$t('sysSecurity.permManage'),
            };
            return map[perm] || perm;
        },
        async loadUsers() {
            this.loading = true;
            try {
                const response = await fetchWithAuth('/api/manage/users');
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || this.$t('sysUsers.loadFailed'));
                }
                this.users = data.users || [];
                if (Array.isArray(data.permissions) && data.permissions.length) {
                    this.availablePermissions = data.permissions;
                }
            } catch (error) {
                this.$message.error(error.message || this.$t('sysUsers.loadFailed'));
            } finally {
                this.loading = false;
            }
        },
        openCreate() {
            this.editingUser = null;
            this.form = this.emptyForm();
            this.dialogVisible = true;
        },
        openEdit(user) {
            this.editingUser = user;
            this.form = {
                username: user.username,
                displayName: user.displayName || user.username,
                password: '',
                enabled: user.enabled !== false,
                permissions: [...(user.permissions || DEFAULT_PERMISSIONS)],
            };
            this.dialogVisible = true;
        },
        submitForm() {
            this.$refs.formRef.validate(async (valid) => {
                if (!valid) return;
                this.saving = true;
                try {
                    const payload = {
                        username: this.form.username.trim(),
                        displayName: this.form.displayName.trim(),
                        enabled: this.form.enabled,
                        permissions: this.form.permissions,
                    };
                    if (this.form.password) {
                        payload.password = this.form.password;
                    }
                    let response;
                    if (this.editingUser) {
                        payload.id = this.editingUser.id;
                        response = await fetchWithAuth('/api/manage/users', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                    } else {
                        response = await fetchWithAuth('/api/manage/users', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                    }
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || this.$t('sysUsers.saveFailed'));
                    }
                    this.$message.success(this.editingUser ? this.$t('sysUsers.updateSuccess') : this.$t('sysUsers.createSuccess'));
                    this.dialogVisible = false;
                    await this.loadUsers();
                } catch (error) {
                    this.$message.error(error.message || this.$t('sysUsers.saveFailed'));
                } finally {
                    this.saving = false;
                }
            });
        },
        async removeUser(user) {
            try {
                await this.$confirm(this.$t('sysUsers.deleteConfirm', { name: user.username }), this.$t('sysUsers.delete'), {
                    type: 'warning',
                });
            } catch {
                return;
            }
            try {
                const response = await fetchWithAuth(`/api/manage/users?id=${encodeURIComponent(user.id)}`, {
                    method: 'DELETE',
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || this.$t('sysUsers.deleteFailed'));
                }
                this.$message.success(this.$t('sysUsers.deleteSuccess'));
                await this.loadUsers();
            } catch (error) {
                this.$message.error(error.message || this.$t('sysUsers.deleteFailed'));
            }
        },
    },
    mounted() {
        this.loadUsers();
    },
};
</script>

<style scoped>
.user-settings {
    min-height: 500px;
}
.first-settings {
    margin-bottom: 40px;
}
.first-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--el-color-primary-light-7);
}
.user-hint {
    color: var(--el-text-color-secondary);
    margin: 0 0 16px;
    font-size: 13px;
}
.token-table-container {
    width: 100%;
    overflow-x: auto;
}
.permission-tag {
    margin: 0 4px 4px 0;
}
.action-button {
    margin: 0 4px;
}
</style>
