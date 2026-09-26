<template>
	<div class="task-files" :data-testid="testId">
		<p class="font-weight-bold mb-1">{{ label }}</p>
		<ul v-if="files.length" class="task-files__list mb-2">
			<li v-for="file in files" :key="file.id" class="d-flex align-center ga-2" :data-testid="`${testId}-file`">
				<VIcon :icon="mdiFileDocumentOutline" size="small" />
				<a :href="file.url" target="_blank" rel="noopener" :download="file.name">{{ file.name }}</a>
				<VBtn
					v-if="editable"
					:icon="mdiTrashCanOutline"
					size="x-small"
					variant="text"
					:aria-label="t('common.actions.remove')"
					:data-testid="`${testId}-delete`"
					@click="remove(file)"
				/>
			</li>
		</ul>
		<p v-else class="text-medium-emphasis mb-2" :data-testid="`${testId}-empty`">{{ emptyText }}</p>
		<template v-if="editable">
			<VBtn
				variant="outlined"
				:prepend-icon="mdiTrayArrowUp"
				:loading="uploading"
				:disabled="!parentId"
				:data-testid="`${testId}-upload`"
				@click="picker?.click()"
			>
				{{ t("pages.taskDetail.files.upload") }}
			</VBtn>
			<input ref="picker" type="file" multiple class="d-none" :data-testid="`${testId}-input`" @change="onPick" />
		</template>
	</div>
</template>

<script setup lang="ts">
import { FileRecord, FileRecordParent } from "@/types/file/File";
import { useFileStorageApi } from "@data-file";
import { mdiFileDocumentOutline, mdiTrashCanOutline, mdiTrayArrowUp } from "@icons/material";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	/** Submission id; files of submissions and gradings hang on it. Without it nothing can be uploaded yet. */
	parentId?: string;
	parentType: FileRecordParent;
	label: string;
	emptyText: string;
	editable?: boolean;
	testId: string;
}>();

const { t } = useI18n();
const { fetchFiles, upload, deleteFiles, getFileRecordsByParentId } = useFileStorageApi();
const picker = ref<HTMLInputElement>();
const uploading = ref(false);

const files = computed<FileRecord[]>(() => (props.parentId ? getFileRecordsByParentId(props.parentId) : []));

watch(
	() => props.parentId,
	async (id) => {
		if (id) await fetchFiles(id, props.parentType);
	},
	{ immediate: true }
);

const onPick = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	const picked = Array.from(input.files ?? []);
	if (!props.parentId || picked.length === 0) return;
	uploading.value = true;
	try {
		for (const file of picked) {
			await upload(file, props.parentId, props.parentType);
		}
	} finally {
		uploading.value = false;
		input.value = "";
	}
};

const remove = async (file: FileRecord) => {
	await deleteFiles([file]);
};
</script>

<style scoped>
.task-files__list {
	list-style: none;
	padding-left: 0;
}
</style>
