<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="personal-files-title">{{ t("pages.files.personal.title") }}</h1>
		</template>

		<VAlert v-if="!userId || !schoolId" type="warning" variant="tonal" data-testid="personal-files-missing-context">
			{{ t("pages.files.personal.missingContext") }}
		</VAlert>

		<template v-else>
			<button
				type="button"
				class="upload-zone mb-4"
				:class="{ 'upload-zone--active': isDragging }"
				data-testid="personal-files-upload"
				@click="fileInput?.click()"
				@dragover.prevent="isDragging = true"
				@dragleave.prevent="isDragging = false"
				@drop.prevent="onDrop"
			>
				<VProgressCircular v-if="isUploading" indeterminate size="28" class="mr-2" />
				<VIcon v-else :icon="mdiCloudUpload" class="mr-2" />
				{{ t("pages.files.personal.uploadHint") }}
			</button>
			<input ref="fileInput" type="file" multiple hidden data-testid="personal-files-input" @change="onPick" />

			<div class="d-flex justify-end ga-2 mb-4">
				<VSelect
					v-model="sortBy"
					:items="sortOptions"
					:aria-label="t('pages.files.personal.sortBy')"
					variant="outlined"
					density="compact"
					hide-details
					class="sort-select"
					data-testid="personal-files-sort"
				/>
				<VBtn
					variant="outlined"
					:icon="sortAscending ? mdiArrowUp : mdiArrowDown"
					:aria-label="t('pages.files.personal.sortOrder')"
					density="comfortable"
					data-testid="personal-files-sort-order"
					@click="sortAscending = !sortAscending"
				/>
			</div>

			<SvsLoading :loading-state="loadingState">
				<p v-if="files.length === 0" class="text-medium-emphasis" data-testid="personal-files-empty">
					{{ t("pages.folder.emptyState") }}
				</p>

				<VTable v-else data-testid="personal-files-list">
					<tbody>
						<tr v-for="file in sortedFiles" :key="file.id" :data-testid="`personal-file-${file.id}`">
							<td class="file-icon"><VIcon :icon="mdiFileDocumentOutline" /></td>
							<td>
								<a :href="file.url" target="_blank" rel="noopener" class="file-name">{{ file.name }}</a>
							</td>
							<td class="text-right text-medium-emphasis">
								{{ formatFileSize(file.size) }}
								<span v-if="file.updatedAt"> · {{ formatUtc(file.updatedAt, "dateTimeYY") }}</span>
							</td>
							<td class="text-right">
								<VBtn
									variant="text"
									:icon="mdiTrayArrowDown"
									:href="file.url"
									:aria-label="t('pages.files.personal.download')"
									size="small"
									download
								/>
							</td>
						</tr>
					</tbody>
				</VTable>
			</SvsLoading>
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { formatUtc } from "@/utils/date-time.utils";
import { formatFileSize } from "@/utils/fileHelper";
import { buildPageTitle } from "@/utils/pageTitle";
import { FileApiFactory, FileRecordParentType, StorageLocation } from "@api-file-storage";
import { notifyError, useAppStoreRefs } from "@data-app";
import { mdiArrowDown, mdiArrowUp, mdiCloudUpload, mdiFileDocumentOutline, mdiTrayArrowDown } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { school, user } = useAppStoreRefs();
const fileApi = FileApiFactory(undefined, "/v3", $axios);

const schoolId = computed(() => school.value?.id);
const userId = computed(() => user.value?.id);

useTitle(buildPageTitle(t("pages.files.personal.title")));

const { data, loadingState, execute } = useSafeAxiosRunner(async () => {
	if (!schoolId.value || !userId.value) return [];
	const response = await fileApi.list(
		schoolId.value,
		StorageLocation.SCHOOL,
		userId.value,
		FileRecordParentType.USERS,
		0,
		100
	);
	return response.data.data;
});

const files = computed(() => data.value ?? []);

const breadcrumbs = computed(() => [{ title: t("pages.files.overview.personalFiles"), href: "/files/my/" }]);

// Sort controls of the legacy file list: field plus direction, newest first by default.
type SortField = "createdAt" | "updatedAt" | "name" | "size";
const sortBy = ref<SortField>("createdAt");
const sortAscending = ref(false);
const sortOptions = computed(() =>
	(["createdAt", "updatedAt", "name", "size"] as SortField[]).map((value) => ({
		value,
		title: t(`pages.files.personal.sort.${value}`),
	}))
);
const sortedFiles = computed(() => {
	const key = sortBy.value;
	const direction = sortAscending.value ? 1 : -1;
	return [...files.value].sort((a, b) => {
		const left = key === "size" ? a.size : (a[key] ?? "");
		const right = key === "size" ? b.size : (b[key] ?? "");
		if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
		return String(left).localeCompare(String(right)) * direction;
	});
});

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const isUploading = ref(false);

const upload = async (list: FileList | null | undefined) => {
	if (!list?.length || !schoolId.value || !userId.value) return;
	isUploading.value = true;
	try {
		for (const file of Array.from(list)) {
			await fileApi.upload(schoolId.value, StorageLocation.SCHOOL, userId.value, FileRecordParentType.USERS, file);
		}
		await execute();
	} catch {
		notifyError(t("pages.files.personal.uploadError"));
	} finally {
		isUploading.value = false;
	}
};

const onPick = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	await upload(input.files);
	input.value = "";
};

const onDrop = async (event: DragEvent) => {
	isDragging.value = false;
	await upload(event.dataTransfer?.files);
};
</script>

<style lang="scss" scoped>
// The dashed upload area of the legacy file view (views/files/file-upload.hbs).
.upload-zone {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 96px;
	padding: 1.5rem;
	font-size: 1.5rem;
	color: rgba(var(--v-theme-on-surface), 0.7);
	background: #f7f7f7;
	border: 2px dashed rgba(var(--v-theme-on-surface), 0.3);
}

.upload-zone--active {
	border-color: rgb(var(--v-theme-primary));
}

.sort-select {
	max-width: 180px;
}

.file-icon {
	width: 48px;
}

.file-name {
	color: inherit;
	text-decoration: none;
}
</style>
