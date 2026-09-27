<template>
	<VDialog
		v-model="isOpen"
		max-width="720"
		scrollable
		:persistent="isApplying"
		data-testid="room-ai-board-dialog"
		@after-leave="onClosed"
	>
		<VCard>
			<VCardItem>
				<template #prepend>
					<VAvatar rounded="lg" color="primary">
						<VIcon :icon="mdiCreation" color="white" />
					</VAvatar>
				</template>
				<VCardTitle>{{ t("pages.roomDetails.aiBoard.title") }}</VCardTitle>
				<VCardSubtitle>{{ t("pages.roomDetails.aiBoard.subtitle") }}</VCardSubtitle>
			</VCardItem>

			<VCardText>
				<div v-if="isApplying" data-testid="room-ai-board-progress">
					<p class="text-body-1 mb-4">{{ t("pages.roomDetails.aiBoard.creating") }}</p>
					<VProgressLinear class="mb-6" :model-value="progress" color="primary" height="8" rounded />
					<RoomTemplateStructure :boards="previewBoards" show-progress :created-keys="createdKeys" />
				</div>

				<template v-else>
					<div class="d-flex ga-3 align-start flex-wrap mb-4">
						<VTextarea
							v-model="prompt"
							class="flex-grow-1 room-ai-board-prompt"
							:label="t('pages.roomDetails.aiBoard.label')"
							:placeholder="t('pages.roomDetails.aiBoard.placeholder')"
							persistent-placeholder
							:disabled="isGenerating"
							rows="2"
							auto-grow
							:counter="MAX_PROMPT_LENGTH"
							:maxlength="MAX_PROMPT_LENGTH"
							hide-details="auto"
							data-testid="room-ai-board-prompt"
							@keydown.enter.exact.prevent="onGenerate"
						/>
						<VTextField
							v-model="maxColumns"
							class="room-ai-board-columns"
							type="number"
							:min="MIN_COLUMNS"
							:max="MAX_COLUMNS"
							:label="t('pages.roomDetails.aiBoard.maxColumns')"
							:hint="t('pages.roomDetails.aiBoard.maxColumns.hint')"
							persistent-hint
							:rules="[columnsRule]"
							:disabled="isGenerating"
							data-testid="room-ai-board-max-columns"
						/>
					</div>

					<VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4" data-testid="room-ai-board-error">
						{{ errorMessage }}
					</VAlert>

					<template v-if="board">
						<p class="text-body-2 text-medium-emphasis mb-4">{{ t("pages.roomDetails.aiBoard.preview") }}</p>
						<RoomTemplateStructure :boards="previewBoards" />
					</template>

					<VProgressLinear v-if="isGenerating" indeterminate color="primary" class="mb-4" />

					<p
						v-if="board && !isGenerating"
						class="text-caption text-medium-emphasis mb-0"
						data-testid="room-ai-board-draft-hint"
					>
						{{ t("pages.roomDetails.aiBoard.draft") }}
					</p>
				</template>
			</VCardText>

			<VCardActions>
				<VBtn variant="text" :disabled="isApplying" data-testid="room-ai-board-cancel-btn" @click="isOpen = false">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VSpacer />
				<VBtn
					v-if="isGenerating"
					variant="text"
					color="primary"
					data-testid="room-ai-board-stop-btn"
					@click="cancelGeneration"
				>
					{{ t("pages.roomDetails.aiBoard.stop") }}
				</VBtn>
				<VBtn
					v-else
					variant="text"
					color="primary"
					:disabled="!canGenerate || isApplying"
					data-testid="room-ai-board-generate-btn"
					@click="onGenerate"
				>
					{{ board ? t("pages.roomDetails.aiBoard.regenerate") : t("pages.roomDetails.aiBoard.generate") }}
				</VBtn>
				<VBtn
					variant="flat"
					color="primary"
					:disabled="!canCreate"
					:loading="isApplying"
					data-testid="room-ai-board-create-btn"
					@click="onCreate"
				>
					{{ t("pages.roomDetails.aiBoard.create") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import RoomTemplateStructure from "./RoomTemplateStructure.vue";
import { notifyError } from "@data-app";
import { useBoardAiTemplate, useRoomTemplate } from "@data-room";
import { mdiCreation } from "@icons/material";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

/** the bounds the server accepts */
const MIN_PROMPT_LENGTH = 3;
const MAX_PROMPT_LENGTH = 1000;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 12;

const props = defineProps({
	roomId: {
		type: String,
		required: true,
	},
});

const emit = defineEmits<{
	(e: "created", boardId: string): void;
}>();

const isOpen = defineModel({ type: Boolean, required: true });

const { t } = useI18n();

const {
	board,
	cancel: cancelGeneration,
	generate,
	hasFailed,
	isBudgetExceeded,
	isForbidden,
	isGenerating,
	reset,
} = useBoardAiTemplate();
const { applyBoard, createdKeys, isApplying, progress } = useRoomTemplate();

const prompt = ref("");
const maxColumns = ref<string | number>("");
const hasCreateFailed = ref(false);

const previewBoards = computed(() => (board.value ? [board.value] : []));

/** undefined leaves the number of columns to the ai, NaN marks an entry the server would reject */
const parsedMaxColumns = computed<number | undefined>(() => {
	const value = String(maxColumns.value ?? "").trim();
	if (value === "") return undefined;

	const count = Number(value);
	return Number.isInteger(count) && count >= MIN_COLUMNS && count <= MAX_COLUMNS ? count : Number.NaN;
});

const columnsRule = () => !Number.isNaN(parsedMaxColumns.value) || t("pages.roomDetails.aiBoard.maxColumns.hint");

const canGenerate = computed(
	() => prompt.value.trim().length >= MIN_PROMPT_LENGTH && !Number.isNaN(parsedMaxColumns.value)
);

const canCreate = computed(
	() => !isGenerating.value && !isApplying.value && board.value !== undefined && board.value.columns.length > 0
);

const errorMessage = computed(() => {
	if (hasCreateFailed.value) return t("pages.roomDetails.aiBoard.createError");
	if (!hasFailed.value) return "";
	if (isBudgetExceeded.value) return t("common.ai.budgetExceeded");
	if (isForbidden.value) return t("pages.roomDetails.aiBoard.forbidden");
	return t("pages.roomDetails.aiBoard.error");
});

watch(isOpen, (open) => {
	if (open) {
		reset();
		hasCreateFailed.value = false;
	}
});

const onGenerate = async () => {
	if (!canGenerate.value || isGenerating.value) return;

	hasCreateFailed.value = false;
	await generate(props.roomId, prompt.value.trim(), { maxColumns: parsedMaxColumns.value });
};

const onCreate = async () => {
	if (!canCreate.value || board.value === undefined) return;

	hasCreateFailed.value = false;
	const { boardId, isComplete } = await applyBoard(props.roomId, board.value);

	if (boardId === undefined) {
		hasCreateFailed.value = true;
		return;
	}

	if (!isComplete) notifyError(t("pages.roomDetails.aiBoard.incomplete"));

	isOpen.value = false;
	emit("created", boardId);
};

const onClosed = () => {
	reset();
	prompt.value = "";
	maxColumns.value = "";
	hasCreateFailed.value = false;
};
</script>

<style scoped>
.room-ai-board-prompt {
	min-width: 260px;
}

.room-ai-board-columns {
	max-width: 180px;
}
</style>
