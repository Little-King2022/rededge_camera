<template>
  <div class="connect-view">
    <a-card :title="t('connect.title')" class="main-card">
      <!-- Active Profile Display -->
      <a-alert
        v-if="cameraStore.activeProfile"
        :message="t('connect.activeCamera', { name: cameraStore.activeProfile.name })"
        :description="`${cameraStore.activeProfile.protocol}://${cameraStore.activeProfile.host}:${cameraStore.activeProfile.port}`"
        type="success"
        show-icon
        class="mb-3"
      />
      <a-alert
        v-else
        :message="t('connect.noActiveTitle')"
        :description="t('connect.noActiveDesc')"
        type="warning"
        show-icon
        class="mb-3"
      />

      <!-- Add Profile Button -->
      <a-button type="primary" @click="showAddModal" class="mb-3">
        {{ t('connect.addProfile') }}
      </a-button>

      <!-- Profiles List -->
      <a-table
        :dataSource="cameraStore.profiles"
        :columns="columns"
        :loading="cameraStore.isLoading"
        :pagination="false"
        rowKey="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'baseUrl'">
            {{ record.protocol }}://{{ record.host }}:{{ record.port }}{{ record.path_prefix }}
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag v-if="record.is_active" color="green">{{ t('connect.status.active') }}</a-tag>
            <a-tag v-else color="default">{{ t('connect.status.inactive') }}</a-tag>
            <a-tag v-if="record.consecutive_failures > 0" color="red">
              {{ t('connect.status.failures', { count: record.consecutive_failures }) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'lastOk'">
            {{ record.last_ok_at ? formatDate(record.last_ok_at) : t('connect.lastOk.never') }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                size="medium"
                @click="handleTest(record)"
                :loading="testingProfileId === record.id"
              >
                {{ t('connect.actions.test') }}
              </a-button>
              <a-button
                v-if="!record.is_active"
                size="medium"
                type="primary"
                @click="handleActivate(record.id)"
              >
                {{ t('connect.actions.activate') }}
              </a-button>
              <a-button size="medium" @click="handleEdit(record)">{{ t('connect.actions.edit') }}</a-button>
              <a-popconfirm
                :title="t('connect.confirmDelete')"
                @confirm="handleDelete(record.id)"
              >
                <a-button size="medium" danger>{{ t('connect.actions.delete') }}</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Add/Edit Profile Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingProfile ? t('connect.modal.editTitle') : t('connect.modal.addTitle')"
      @ok="handleSave"
      @cancel="handleCancel"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item :label="t('connect.form.nameLabel')" required>
          <a-input v-model:value="formData.name" :placeholder="t('connect.form.namePlaceholder')" />
        </a-form-item>

        <a-form-item :label="t('connect.form.protocolLabel')" required>
          <a-select v-model:value="formData.protocol">
            <a-select-option value="http">HTTP</a-select-option>
            <a-select-option value="https">HTTPS</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('connect.form.hostLabel')" required>
          <a-input v-model:value="formData.host" :placeholder="t('connect.form.hostPlaceholder')" />
        </a-form-item>

        <a-form-item :label="t('connect.form.portLabel')" required>
          <a-input-number v-model:value="formData.port" :min="1" :max="65535" style="width: 100%" />
        </a-form-item>

        <a-form-item :label="t('connect.form.pathPrefixLabel')">
          <a-input v-model:value="formData.path_prefix" :placeholder="t('connect.form.pathPrefixPlaceholder')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useCameraStore } from '../stores/camera'
import { useI18n } from 'vue-i18n'

const cameraStore = useCameraStore()
const { t, locale } = useI18n()

const modalVisible = ref(false)
const editingProfile = ref(null)
const testingProfileId = ref(null)

const formData = ref({
  name: '',
  protocol: 'http',
  host: '',
  port: 80,
  path_prefix: ''
})

const columns = computed(() => [
  { title: t('connect.columns.name'), dataIndex: 'name', key: 'name' },
  { title: t('connect.columns.baseUrl'), key: 'baseUrl' },
  { title: t('connect.columns.status'), key: 'status' },
  { title: t('connect.columns.lastOk'), key: 'lastOk' },
  { title: t('connect.columns.actions'), key: 'actions' }
])

onMounted(async () => {
  await cameraStore.loadProfiles()
  await cameraStore.loadActiveProfile()
})

function showAddModal() {
  editingProfile.value = null
  formData.value = {
    name: '',
    protocol: 'http',
    host: '',
    port: 80,
    path_prefix: ''
  }
  modalVisible.value = true
}

function handleEdit(profile) {
  editingProfile.value = profile
  formData.value = {
    name: profile.name,
    protocol: profile.protocol,
    host: profile.host,
    port: profile.port,
    path_prefix: profile.path_prefix || ''
  }
  modalVisible.value = true
}

async function handleSave() {
  if (!formData.value.name || !formData.value.host || !formData.value.port) {
    message.error(t('connect.messages.requiredFields'))
    return
  }

  try {
    if (editingProfile.value) {
      await cameraStore.updateProfile(editingProfile.value.id, formData.value)
      message.success(t('connect.messages.profileUpdated'))
    } else {
      await cameraStore.createProfile(formData.value)
      message.success(t('connect.messages.profileCreated'))
    }
    modalVisible.value = false
  } catch (error) {
    message.error(t('connect.messages.saveFailed', { error: error.message }))
  }
}

function handleCancel() {
  modalVisible.value = false
}

async function handleTest(profile) {
  testingProfileId.value = profile.id
  try {
    const result = await cameraStore.testConnection(profile.id)
    if (result.success) {
      message.success(t('connect.messages.testSuccess'))
    } else {
      message.error(t('connect.messages.testFailed', { error: result.error }))
    }
  } catch (error) {
    message.error(t('connect.messages.testFailedGeneric', { error: error.message }))
  } finally {
    testingProfileId.value = null
  }
}

async function handleActivate(id) {
  try {
    await cameraStore.setActiveProfile(id)
    message.success(t('connect.messages.activated'))
  } catch (error) {
    message.error(t('connect.messages.activateFailed', { error: error.message }))
  }
}

async function handleDelete(id) {
  try {
    await cameraStore.deleteProfile(id)
    message.success(t('connect.messages.deleted'))
  } catch (error) {
    message.error(t('connect.messages.deleteFailed', { error: error.message }))
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleString(locale.value)
}
</script>

<style scoped>
.connect-view {
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mb-3 {
  margin-bottom: 16px;
}
</style>
