<template>
	<VSheet border rounded class="pa-4 mb-8" data-testid="room-ai-prompt">
		<div class="d-flex align-center ga-2 mb-1">
			<VIcon :icon="mdiCreation" color="primary" />
			<span class="text-subtitle-1 font-weight-bold">{{ t("pages.roomCreate.ai.title") }}</span>
		</div>
		<p class="text-body-2 text-medium-emphasis mb-3">{{ t("pages.roomCreate.ai.subtitle") }}</p>
		<div class="d-flex ga-3 align-start flex-wrap">
			<VTextarea
				v-model="prompt"
				class="flex-grow-1 room-ai-prompt-input"
				:label="t('pages.roomCreate.ai.label')"
				:placeholder="t('pages.roomCreate.ai.placeholder')"
				:disabled="isGenerating"
				rows="2"
				auto-grow
				counter="1000"
				:maxlength="1000"
				hide-details="auto"
				data-testid="room-ai-prompt-input"
				@keydown.enter.exact.prevent="onGenerate"
			/>
			<VBtn
				color="primary"
				variant="flat"
				size="large"
				:loading="isGenerating"
				:disabled="isTooShort"
				data-testid="room-ai-generate-btn"
				@click="onGenerate"
			>
				{{ t("pages.roomCreate.ai.generate") }}
			</VBtn>
		</div>
	</VSheet>
</template>

<script setup lang="ts">
import { mdiCreation } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const MIN_PROMPT_LENGTH = 3;

defineProps({
	isGenerating: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits<{
	(e: "generate", prompt: string): void;
}>();

const { t } = useI18n();

const prompt = ref("");
const isTooShort = computed(() => prompt.value.trim().length < MIN_PROMPT_LENGTH);

const onGenerate = () => {
	if (!isTooShort.value) emit("generate", prompt.value.trim());
};
</script>

<style scoped>
.room-ai-prompt-input {
	min-width: 260px;
}
</style>
