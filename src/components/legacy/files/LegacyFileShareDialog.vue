<template>
	<VDialog :model-value="modelValue" max-width="560" @update:model-value="emit('update:modelValue', $event)">
		<VCard data-testid="legacy-file-share-dialog">
			<VCardTitle class="text-h5 pt-4 px-6">{{ t("pages.files.legacy.shareLinkTitle") }}</VCardTitle>
			<VCardText class="px-6">
				<p>{{ t("pages.files.legacy.shareLinkHint") }}</p>
				<VProgressLinear v-if="!link && !failed" indeterminate />
				<p v-else-if="failed" class="text-error">{{ t("pages.files.legacy.actionError") }}</p>
				<VTextField
					v-else
					:model-value="link"
					readonly
					variant="outlined"
					density="comfortable"
					hide-details
					data-testid="legacy-file-share-link"
					@focus="($event.target as HTMLInputElement).select()"
				>
					<template #append-inner>
						<VBtn
							variant="text"
							:icon="mdiContentCopy"
							size="small"
							:aria-label="t('pages.files.legacy.copyLink')"
							data-testid="legacy-file-share-copy"
							@click="copy"
						/>
					</template>
				</VTextField>
			</VCardText>
			<VCardActions class="px-6 pb-4">
				<VSpacer />
				<VBtn variant="outlined" @click="emit('update:modelValue', false)">{{ t("pages.files.legacy.close") }}</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { notifySuccess } from "@data-app";
import { LegacyFile, legacyFileStorageApi } from "@data-legacy-files";
import { mdiContentCopy } from "@icons/material";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ modelValue: boolean; file?: LegacyFile }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

const { t } = useI18n();
const link = ref("");
const failed = ref(false);

watch(
	() => [props.modelValue, props.file] as const,
	async ([open, file]) => {
		if (!open || !file) return;
		link.value = "";
		failed.value = false;
		try {
			const token = await legacyFileStorageApi.shareToken(file);
			// Same target as the product's share links: the proxy route registers the
			// share token for whoever opens it, then opens the file.
			link.value = `${window.location.origin}/files/fileModel/${file._id}/proxy?share=${encodeURIComponent(token)}`;
		} catch {
			failed.value = true;
		}
	},
	{ immediate: true }
);

const copy = async () => {
	await navigator.clipboard.writeText(link.value);
	notifySuccess(t("pages.files.legacy.linkCopied"));
};
</script>
