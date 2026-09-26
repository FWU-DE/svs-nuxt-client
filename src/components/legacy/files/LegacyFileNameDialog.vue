<template>
	<VDialog :model-value="modelValue" max-width="480" @update:model-value="emit('update:modelValue', $event)">
		<VCard data-testid="legacy-file-name-dialog">
			<VCardTitle class="text-h5 pt-4 px-6">{{ title }}</VCardTitle>
			<VForm @submit.prevent="submit">
				<VCardText class="px-6">
					<label class="d-block mb-1" for="legacy-file-name-input">{{ label }}</label>
					<VTextField
						id="legacy-file-name-input"
						v-model="name"
						variant="outlined"
						density="comfortable"
						autofocus
						hide-details
						data-testid="legacy-file-name-input"
					/>
				</VCardText>
				<VCardActions class="px-6 pb-4">
					<VSpacer />
					<VBtn variant="outlined" data-testid="legacy-file-name-cancel" @click="emit('update:modelValue', false)">
						{{ t("common.actions.cancel") }}
					</VBtn>
					<VBtn
						color="primary"
						variant="flat"
						type="submit"
						:disabled="!name.trim()"
						data-testid="legacy-file-name-submit"
					>
						{{ submitLabel }}
					</VBtn>
				</VCardActions>
			</VForm>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue: boolean;
	title: string;
	label: string;
	submitLabel: string;
	initialName?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "submit", name: string): void;
}>();

const { t } = useI18n();
const name = ref("");

watch(
	() => props.modelValue,
	(open) => {
		if (open) name.value = props.initialName ?? "";
	},
	{ immediate: true }
);

const submit = () => {
	const trimmed = name.value.trim();
	if (!trimmed) return;
	emit("submit", trimmed);
	emit("update:modelValue", false);
};
</script>
