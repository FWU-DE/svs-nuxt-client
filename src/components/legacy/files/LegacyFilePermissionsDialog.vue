<template>
	<VDialog :model-value="modelValue" max-width="560" @update:model-value="emit('update:modelValue', $event)">
		<VCard data-testid="legacy-file-permissions-dialog">
			<VCardTitle class="text-h5 pt-4 px-6">{{ t("pages.files.legacy.editPermissionsTitle") }}</VCardTitle>
			<VCardText class="px-6">
				<VProgressLinear v-if="loading" indeterminate />
				<p v-else-if="loadError" class="text-error" data-testid="legacy-file-permissions-error">
					{{ t("pages.files.legacy.permissionsError") }}
				</p>
				<p v-else-if="rows.length === 0" data-testid="legacy-file-permissions-empty">
					{{ t("pages.files.legacy.noPermissions") }}
				</p>
				<VTable v-else density="compact" data-testid="legacy-file-permissions-table">
					<thead>
						<tr>
							<th>{{ t("pages.files.legacy.roleUser") }}</th>
							<th>{{ t("pages.files.legacy.read") }}</th>
							<th>{{ t("pages.files.legacy.write") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, index) in rows" :key="row.refId" :data-testid="`legacy-permission-${row.refId}`">
							<th scope="row" class="font-weight-regular">{{ roleLabel(row.name) }}</th>
							<td v-for="action in actions" :key="action">
								<VCheckboxBtn
									:model-value="row[action] ?? true"
									:disabled="row[action] === undefined"
									:aria-label="`${roleLabel(row.name)}: ${t(`pages.files.legacy.${action}`)}`"
									:data-testid="`legacy-permission-${action}-${row.refId}`"
									@update:model-value="toggle(index, action, Boolean($event))"
								/>
							</td>
						</tr>
					</tbody>
				</VTable>
			</VCardText>
			<VCardActions class="px-6 pb-4">
				<VSpacer />
				<VBtn variant="outlined" @click="emit('update:modelValue', false)">{{ t("common.actions.cancel") }}</VBtn>
				<VBtn
					color="primary"
					variant="flat"
					:disabled="loading || loadError || rows.length === 0"
					data-testid="legacy-file-permissions-save"
					@click="save"
				>
					{{ t("common.actions.save") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { notifyError, notifySuccess } from "@data-app";
import { legacyFileStorageApi, LegacyPermissionEntry } from "@data-legacy-files";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ modelValue: boolean; fileId?: string }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

const { t, te } = useI18n();
const actions = ["read", "write"] as const;
type PermissionAction = (typeof actions)[number];

const rows = ref<LegacyPermissionEntry[]>([]);
const original = ref<LegacyPermissionEntry[]>([]);
const loading = ref(false);
const loadError = ref(false);

const roleLabel = (name: string) =>
	te(`pages.files.legacy.role.${name}`) ? t(`pages.files.legacy.role.${name}`) : name;

watch(
	() => [props.modelValue, props.fileId] as const,
	async ([open, fileId]) => {
		if (!open || !fileId) return;
		loading.value = true;
		loadError.value = false;
		try {
			// The legacy dialog lists the roles from the highest down.
			const permissions = (await legacyFileStorageApi.permissions(fileId)).reverse();
			rows.value = permissions.map((p) => ({ ...p }));
			original.value = permissions.map((p) => ({ ...p }));
		} catch {
			loadError.value = true;
		} finally {
			loading.value = false;
		}
	},
	{ immediate: true }
);

// Unticking a role unticks every role below it in the same column, as in the legacy dialog.
const toggle = (index: number, action: PermissionAction, checked: boolean) => {
	rows.value[index][action] = checked;
	if (!checked) {
		rows.value.forEach((row, i) => {
			if (i > index && row[action] !== undefined) row[action] = false;
		});
	}
};

const save = async () => {
	if (!props.fileId) return;
	const changed = rows.value
		.map((row, i) => {
			const before = original.value[i];
			const update: { refId: string; read?: boolean; write?: boolean } = { refId: row.refId };
			actions.forEach((action) => {
				if (row[action] !== undefined && row[action] !== before[action]) update[action] = row[action];
			});
			return update;
		})
		.filter((update) => update.read !== undefined || update.write !== undefined);
	try {
		if (changed.length) await legacyFileStorageApi.updatePermissions(props.fileId, changed);
		notifySuccess(t("pages.files.legacy.permissionsSaved"));
		emit("update:modelValue", false);
	} catch {
		notifyError(t("pages.files.legacy.actionError"));
	}
};
</script>
