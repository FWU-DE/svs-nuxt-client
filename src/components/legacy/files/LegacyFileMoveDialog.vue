<template>
	<VDialog :model-value="modelValue" max-width="560" @update:model-value="emit('update:modelValue', $event)">
		<VCard data-testid="legacy-file-move-dialog">
			<VCardTitle class="text-h5 pt-4 px-6">{{ title }}</VCardTitle>
			<VCardText class="px-6">
				<p class="mb-2">{{ t("pages.files.legacy.selectFolder") }}</p>
				<VProgressLinear v-if="loading" indeterminate />
				<VList v-else density="compact" class="move-targets" data-testid="legacy-file-move-targets">
					<VListItem
						v-for="target in targets"
						:key="target.id"
						:active="selected === target.id"
						:disabled="target.id === currentParent"
						:style="{ paddingInlineStart: `${16 + target.depth * 20}px` }"
						:data-testid="`legacy-move-target-${target.id}`"
						@click="selected = target.id"
					>
						<template #prepend><VIcon :icon="mdiFolder" size="small" /></template>
						<VListItemTitle>{{ target.name }}</VListItemTitle>
					</VListItem>
				</VList>
			</VCardText>
			<VCardActions class="px-6 pb-4">
				<VSpacer />
				<VBtn variant="outlined" @click="emit('update:modelValue', false)">{{ t("common.actions.cancel") }}</VBtn>
				<VBtn
					color="primary"
					variant="flat"
					:disabled="!selected"
					data-testid="legacy-file-move-submit"
					@click="submit"
				>
					{{ t("common.actions.move") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { LegacyFile, legacyFileStorageApi } from "@data-legacy-files";
import { mdiFolder } from "@icons/material";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue: boolean;
	item?: LegacyFile;
	/** Root of the tree: the user's id for personal files, else the course or team id. */
	rootId: string;
	rootName: string;
	/** Owner for listing folders (undefined for personal files). */
	ownerId?: string;
}>();
const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "move", parent: string): void;
}>();

const { t } = useI18n();
const title = computed(() =>
	t(props.item?.isDirectory ? "pages.files.legacy.moveFolder" : "pages.files.legacy.moveFile")
);
const currentParent = computed(() => props.item?.parent ?? props.rootId);

interface Target {
	id: string;
	name: string;
	depth: number;
}
const targets = ref<Target[]>([]);
const loading = ref(false);
const selected = ref<string>();

/** All folders of the owner, depth first; the moved folder and its content are no target. */
const collect = async (parent: string | undefined, depth: number, out: Target[]) => {
	const entries = await legacyFileStorageApi.list(props.ownerId, parent);
	for (const dir of entries.filter((e) => e.isDirectory && e._id !== props.item?._id)) {
		out.push({ id: dir._id, name: dir.name, depth });
		await collect(dir._id, depth + 1, out);
	}
};

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return;
		selected.value = undefined;
		loading.value = true;
		try {
			const out: Target[] = [{ id: props.rootId, name: props.rootName, depth: 0 }];
			await collect(undefined, 1, out);
			targets.value = out;
		} finally {
			loading.value = false;
		}
	},
	{ immediate: true }
);

const submit = () => {
	if (!selected.value) return;
	emit("move", selected.value);
	emit("update:modelValue", false);
};
</script>

<style scoped>
.move-targets {
	max-height: 360px;
	overflow-y: auto;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
}
</style>
