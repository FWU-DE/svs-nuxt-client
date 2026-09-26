<template>
	<div class="legacy-file-browser" data-testid="legacy-file-browser">
		<template v-if="canUpload">
			<button
				type="button"
				class="upload-zone mb-4"
				:class="{ 'upload-zone--active': isDragging }"
				data-testid="legacy-file-upload"
				@click="fileInput?.click()"
				@dragover.prevent="isDragging = true"
				@dragleave.prevent="isDragging = false"
				@drop.prevent="onDrop"
			>
				<template v-if="isUploading">
					<VProgressCircular indeterminate size="28" class="mr-2" />
					{{ t("pages.files.legacy.uploading") }}
				</template>
				<template v-else>
					<VIcon :icon="mdiCloudUpload" class="mr-2" />
					{{ t("pages.files.legacy.uploadHint") }}
				</template>
			</button>
			<input ref="fileInput" type="file" multiple hidden data-testid="legacy-file-input" @change="onPick" />
		</template>

		<div class="d-flex justify-end ga-2 mb-2">
			<VSelect
				v-model="sortBy"
				:items="sortOptions"
				:aria-label="t('pages.files.legacy.sortBy')"
				variant="outlined"
				density="compact"
				hide-details
				class="sort-select"
				data-testid="legacy-file-sort"
			/>
			<VBtn
				variant="outlined"
				:icon="sortAscending ? mdiArrowUp : mdiArrowDown"
				:aria-label="t('pages.files.legacy.sorting')"
				density="comfortable"
				data-testid="legacy-file-sort-order"
				@click="sortAscending = !sortAscending"
			/>
		</div>

		<VProgressLinear v-if="loading" indeterminate class="mb-4" />

		<template v-else>
			<p v-if="!directories.length && !files.length" class="text-medium-emphasis" data-testid="legacy-file-empty">
				{{ t("pages.folder.emptyState") }}
			</p>

			<section v-if="directories.length" class="mb-6">
				<h2 class="text-subtitle-1 font-weight-bold py-3" data-testid="legacy-folder-heading">
					{{ t("pages.files.legacy.folders") }}
				</h2>
				<div
					v-for="dir in directories"
					:key="dir._id"
					class="folder-card"
					role="button"
					tabindex="0"
					:aria-label="t('pages.files.legacy.openFolder', { name: dir.name })"
					:data-testid="`legacy-folder-${dir._id}`"
					@click="emit('open-folder', dir)"
					@keydown.enter.prevent="emit('open-folder', dir)"
				>
					<VIcon :icon="mdiFolder" class="mr-2" color="#f8c34f" />
					<strong class="flex-grow-1">{{ dir.name }}</strong>
					<template v-if="canManage">
						<VBtn
							variant="text"
							size="small"
							:icon="mdiPencilOutline"
							:aria-label="t('pages.files.legacy.renameFolder')"
							:data-testid="`legacy-folder-rename-${dir._id}`"
							@click.stop="openRename(dir)"
						/>
						<VBtn
							variant="text"
							size="small"
							:icon="mdiFolderMoveOutline"
							:aria-label="t('pages.files.legacy.moveFolder')"
							:data-testid="`legacy-folder-move-${dir._id}`"
							@click.stop="openMove(dir)"
						/>
						<VBtn
							variant="text"
							size="small"
							:icon="mdiTrashCanOutline"
							:aria-label="t('pages.files.legacy.deleteFolder')"
							:data-testid="`legacy-folder-delete-${dir._id}`"
							@click.stop="toDelete = dir"
						/>
					</template>
				</div>
			</section>

			<section v-if="files.length">
				<h2 class="text-subtitle-1 font-weight-bold py-3" data-testid="legacy-file-heading">
					{{ t("pages.files.legacy.files") }}
				</h2>
				<div
					v-for="file in files"
					:key="file._id"
					class="file-card"
					:class="{ 'file-card--blocked': isBlocked(file) }"
					:data-testid="`legacy-file-${file._id}`"
				>
					<div class="d-flex align-center">
						<VIcon :icon="isBlocked(file) ? mdiAlert : mdiFileDocumentOutline" class="mr-3" />
						<a
							v-if="!isBlocked(file)"
							href="#"
							class="file-name flex-grow-1"
							:aria-label="t('pages.files.legacy.openFile', { name: file.name })"
							:data-testid="`legacy-file-open-${file._id}`"
							@click.prevent="open(file)"
							>{{ file.name }}</a
						>
						<span v-else class="file-name flex-grow-1">{{ file.name }}</span>
						<small class="text-medium-emphasis ml-2">
							{{ formatFileSize(file.size ?? 0) }} · {{ formatUtc(file.updatedAt, "dateTimeYY") }}
						</small>
					</div>
					<p v-if="isBlocked(file)" class="text-error text-caption mb-0 mt-1">
						{{ t("pages.files.legacy.fileBlocked") }}
					</p>
					<div class="file-actions">
						<VBtn
							variant="text"
							size="small"
							:icon="mdiTrayArrowDown"
							:disabled="isBlocked(file)"
							:aria-label="t('pages.files.legacy.downloadFile')"
							:data-testid="`legacy-file-download-${file._id}`"
							@click="download(file)"
						/>
						<template v-if="canManage">
							<VBtn
								variant="text"
								size="small"
								:icon="mdiPencilOutline"
								:disabled="isBlocked(file)"
								:aria-label="t('pages.files.legacy.renameFile')"
								:data-testid="`legacy-file-rename-${file._id}`"
								@click="openRename(file)"
							/>
							<VBtn
								variant="text"
								size="small"
								:icon="mdiFolderMoveOutline"
								:aria-label="t('pages.files.legacy.moveFile')"
								:data-testid="`legacy-file-move-${file._id}`"
								@click="openMove(file)"
							/>
							<VBtn
								variant="text"
								size="small"
								:icon="mdiTrashCanOutline"
								:aria-label="t('pages.files.legacy.deleteFile')"
								:data-testid="`legacy-file-delete-${file._id}`"
								@click="toDelete = file"
							/>
							<VBtn
								variant="text"
								size="small"
								:icon="mdiShareVariantOutline"
								:disabled="isBlocked(file)"
								:aria-label="t('pages.files.legacy.shareFile')"
								:data-testid="`legacy-file-share-${file._id}`"
								@click="shareFile = file"
							/>
							<VBtn
								v-if="canEditPermissions"
								variant="text"
								size="small"
								:icon="mdiCogOutline"
								:disabled="isBlocked(file)"
								:aria-label="t('pages.files.legacy.editPermissions')"
								:data-testid="`legacy-file-permissions-${file._id}`"
								@click="permissionsFileId = file._id"
							/>
						</template>
					</div>
				</div>
			</section>
		</template>

		<div v-if="canCreateDir" class="mt-6">
			<VBtn
				color="primary"
				variant="flat"
				:prepend-icon="mdiPlus"
				data-testid="legacy-create-folder"
				@click="createOpen = true"
			>
				{{ t("pages.files.legacy.createFolder") }}
			</VBtn>
		</div>

		<LegacyFileNameDialog
			v-model="createOpen"
			:title="t('pages.files.legacy.newFolderTitle')"
			:label="t('pages.files.legacy.folderName')"
			:submit-label="t('pages.files.legacy.createFolderSubmit')"
			@submit="createFolder"
		/>
		<LegacyFileNameDialog
			v-model="renameOpen"
			:title="renameItem?.isDirectory ? t('pages.files.legacy.renameDirTitle') : t('pages.files.legacy.renameFile')"
			:label="t('pages.files.legacy.chooseNewName')"
			:submit-label="t('common.actions.rename')"
			:initial-name="renameItem?.name"
			@submit="rename"
		/>
		<LegacyFileMoveDialog
			v-model="moveOpen"
			:item="moveItem"
			:root-id="rootId"
			:root-name="rootName"
			:owner-id="ownerId"
			@move="move"
		/>
		<LegacyFileShareDialog :model-value="!!shareFile" :file="shareFile" @update:model-value="shareFile = undefined" />
		<LegacyFilePermissionsDialog
			:model-value="!!permissionsFileId"
			:file-id="permissionsFileId"
			@update:model-value="permissionsFileId = undefined"
		/>

		<VDialog :model-value="!!toDelete" max-width="480" @update:model-value="toDelete = undefined">
			<VCard data-testid="legacy-file-delete-dialog">
				<VCardTitle class="text-h5 pt-4 px-6 text-wrap">
					{{ t("pages.files.legacy.assertDeletion", { filename: toDelete?.name ?? "" }) }}
				</VCardTitle>
				<VCardActions class="px-6 pb-4">
					<VSpacer />
					<VBtn variant="outlined" @click="toDelete = undefined">{{ t("common.actions.cancel") }}</VBtn>
					<VBtn color="error" variant="flat" data-testid="legacy-file-delete-confirm" @click="remove">
						{{ t("common.actions.delete") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</div>
</template>

<script setup lang="ts">
import LegacyFileMoveDialog from "./LegacyFileMoveDialog.vue";
import LegacyFileNameDialog from "./LegacyFileNameDialog.vue";
import LegacyFilePermissionsDialog from "./LegacyFilePermissionsDialog.vue";
import LegacyFileShareDialog from "./LegacyFileShareDialog.vue";
import { formatUtc } from "@/utils/date-time.utils";
import { formatFileSize } from "@/utils/fileHelper";
import { notifyError, notifySuccess } from "@data-app";
import { LegacyFile, legacyFileStorageApi } from "@data-legacy-files";
import {
	mdiAlert,
	mdiArrowDown,
	mdiArrowUp,
	mdiCloudUpload,
	mdiCogOutline,
	mdiFileDocumentOutline,
	mdiFolder,
	mdiFolderMoveOutline,
	mdiPencilOutline,
	mdiPlus,
	mdiShareVariantOutline,
	mdiTrashCanOutline,
	mdiTrayArrowDown,
} from "@icons/material";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		/** Course or team id; undefined for personal files. */
		ownerId?: string;
		/** The folder shown; undefined for the root of the owner. */
		parentId?: string;
		/** Id of the root in the move dialog: the user's id for personal files. */
		rootId: string;
		rootName: string;
		canUpload?: boolean;
		canCreateDir?: boolean;
		canManage?: boolean;
		canEditPermissions?: boolean;
		/** Replaces the listing, e.g. for the files shared with me. */
		loader?: () => Promise<LegacyFile[]>;
	}>(),
	{
		ownerId: undefined,
		parentId: undefined,
		canUpload: true,
		canCreateDir: true,
		canManage: true,
		canEditPermissions: true,
		loader: undefined,
	}
);

const emit = defineEmits<{ (e: "open-folder", folder: LegacyFile): void }>();

const { t } = useI18n();

const entries = ref<LegacyFile[]>([]);
const loading = ref(true);

const load = async () => {
	loading.value = true;
	try {
		entries.value = props.loader
			? await props.loader()
			: await legacyFileStorageApi.list(props.ownerId, props.parentId);
	} catch {
		entries.value = [];
		notifyError(t("pages.files.legacy.noAccess"));
	} finally {
		loading.value = false;
	}
};

watch(() => [props.ownerId, props.parentId], load, { immediate: true });

// Sort controls of the legacy file list; newest change first by default.
type SortField = "createdAt" | "updatedAt" | "name" | "size";
const sortBy = ref<SortField>("updatedAt");
const sortAscending = ref(false);
const sortOptions = computed(() =>
	(["createdAt", "updatedAt", "name", "size"] as SortField[]).map((value) => ({
		value,
		title: t(`pages.files.legacy.sort.${value}`),
	}))
);

/** `dataSort` of the legacy controller: missing values last, numbers numerically, strings by locale. */
const sorted = (list: LegacyFile[]) => {
	const key = sortBy.value;
	const result = [...list].sort((a, b) => {
		const left = a[key];
		const right = b[key];
		if (left === undefined || left === null) return 1;
		if (right === undefined || right === null) return -1;
		if (typeof left === "number" && typeof right === "number") return left - right;
		return String(left).localeCompare(String(right));
	});
	return sortAscending.value ? result : result.reverse();
};

const directories = computed(() => sorted(entries.value.filter((e) => e.isDirectory)));
const files = computed(() => sorted(entries.value.filter((e) => !e.isDirectory)));

const isBlocked = (file: LegacyFile) => file.securityCheck?.status === "blocked";

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const isUploading = ref(false);

const upload = async (list: FileList | null | undefined) => {
	if (!list?.length) return;
	isUploading.value = true;
	try {
		for (const file of Array.from(list)) {
			await legacyFileStorageApi.upload(file, props.ownerId, props.parentId);
		}
		notifySuccess(t("pages.files.legacy.uploadSuccess"));
	} catch {
		notifyError(t("pages.files.personal.uploadError"));
	} finally {
		isUploading.value = false;
		await load();
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

const run = async (action: () => Promise<unknown>, success?: string) => {
	try {
		await action();
		if (success) notifySuccess(success);
	} catch {
		notifyError(t("pages.files.legacy.actionError"));
	} finally {
		await load();
	}
};

const createOpen = ref(false);
const createFolder = (name: string) =>
	run(() => legacyFileStorageApi.createDirectory(name, props.ownerId, props.parentId));

const renameOpen = ref(false);
const renameItem = ref<LegacyFile>();
const openRename = (item: LegacyFile) => {
	renameItem.value = item;
	renameOpen.value = true;
};
const rename = (name: string) => {
	const item = renameItem.value;
	if (!item) return;
	return run(
		() => legacyFileStorageApi.rename(item, name),
		t(item.isDirectory ? "pages.files.legacy.renameDirSuccess" : "pages.files.legacy.renameFileSuccess")
	);
};

const moveOpen = ref(false);
const moveItem = ref<LegacyFile>();
const openMove = (item: LegacyFile) => {
	moveItem.value = item;
	moveOpen.value = true;
};
const move = async (parent: string) => {
	const item = moveItem.value;
	if (!item) return;
	try {
		await legacyFileStorageApi.move(item, parent);
		notifySuccess(t("pages.files.legacy.fileMoved"));
	} catch {
		notifyError(t("pages.files.legacy.moveError"));
	} finally {
		await load();
	}
};

const toDelete = ref<LegacyFile>();
const remove = async () => {
	const item = toDelete.value;
	toDelete.value = undefined;
	if (item) await run(() => legacyFileStorageApi.remove(item));
};

const shareFile = ref<LegacyFile>();
const permissionsFileId = ref<string>();

const open = async (file: LegacyFile) => {
	try {
		window.open(await legacyFileStorageApi.signedUrl(file, false), "_blank", "noopener");
	} catch {
		notifyError(t("pages.files.legacy.openError"));
	}
};

const download = async (file: LegacyFile) => {
	try {
		window.location.assign(await legacyFileStorageApi.signedUrl(file, true));
	} catch {
		notifyError(t("pages.files.legacy.openError"));
	}
};

defineExpose({ reload: load });
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
	max-width: 200px;
}

// Folder and file cards of views/files/files.hbs and files-grid.hbs.
.folder-card,
.file-card {
	border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
	border-radius: 4px;
	padding: 0.75rem 1rem;
	margin-bottom: 0.75rem;
	background: rgb(var(--v-theme-surface));
}

.folder-card {
	display: flex;
	align-items: center;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background: rgba(var(--v-theme-on-surface), 0.04);
	}
}

.file-card--blocked {
	border-color: rgb(var(--v-theme-error));
}

.file-name {
	color: inherit;
	text-decoration: none;
	font-weight: 500;
}

.file-actions {
	margin-top: 0.25rem;
	margin-left: 2.25rem;
}
</style>
