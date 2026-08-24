<template>
	<VDialog v-model="isOpen" max-width="640" scrollable data-testid="board-ai-dialog" @after-leave="onClose">
		<VCard>
			<VCardItem>
				<template #prepend>
					<VAvatar rounded="lg" color="primary">
						<VIcon :icon="mdiCreation" color="white" />
					</VAvatar>
				</template>
				<VCardTitle>{{ t("components.board.ai.title") }}</VCardTitle>
				<VCardSubtitle>
					{{ source.kind === "card" ? t("components.board.ai.source.card") : t("components.board.ai.source.column") }}
				</VCardSubtitle>
			</VCardItem>

			<VCardText>
				<VChipGroup v-model="preset" mandatory selected-class="text-primary" class="mb-2">
					<VChip
						v-for="option in PRESETS"
						:key="option"
						:value="option"
						:data-testid="`board-ai-preset-${option}`"
						:disabled="isGenerating"
						filter
						variant="outlined"
					>
						{{ t(`components.board.ai.preset.${option}`) }}
					</VChip>
				</VChipGroup>
				<p class="text-body-2 text-medium-emphasis mb-4">{{ t(`components.board.ai.preset.${preset}.hint`) }}</p>

				<VTextarea
					v-if="preset === 'free'"
					v-model="prompt"
					:label="t('components.board.ai.prompt.label')"
					:placeholder="t('components.board.ai.prompt.placeholder')"
					:disabled="isGenerating"
					rows="2"
					auto-grow
					counter="1000"
					:maxlength="1000"
					hide-details="auto"
					class="mb-4"
					data-testid="board-ai-prompt"
				/>

				<VAlert v-if="hasFailed" type="error" variant="tonal" class="mb-4" data-testid="board-ai-error">
					{{ t("components.board.ai.error") }}
				</VAlert>

				<VProgressLinear v-if="isGenerating" indeterminate color="primary" class="mb-4" />

				<div v-if="!isEmpty" class="d-flex flex-column ga-2">
					<VSheet
						v-for="(card, index) in cards"
						:key="index"
						border
						rounded
						class="pa-3"
						:data-testid="`board-ai-card-${index}`"
					>
						<VCheckbox
							:model-value="isAccepted(index)"
							density="compact"
							hide-details
							:data-testid="`board-ai-card-checkbox-${index}`"
							@update:model-value="toggle(index)"
						>
							<template #label>
								<span class="font-weight-bold">{{ card.title }}</span>
							</template>
						</VCheckbox>
						<div v-for="(element, elementIndex) in card.elements" :key="elementIndex" class="text-body-2 ml-8">
							<RenderHTML v-if="element.kind === 'text'" :html="element.text" component="div" />
							<a v-else :href="element.url" target="_blank" rel="noopener">{{ element.title }}</a>
						</div>
					</VSheet>
				</div>
			</VCardText>

			<VCardActions>
				<VBtn variant="text" data-testid="board-ai-cancel-btn" @click="isOpen = false">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VSpacer />
				<VBtn
					variant="text"
					color="primary"
					:loading="isGenerating"
					data-testid="board-ai-generate-btn"
					@click="onGenerate"
				>
					{{ isEmpty ? t("components.board.ai.generate") : t("components.board.ai.regenerate") }}
				</VBtn>
				<VBtn
					variant="flat"
					color="primary"
					:disabled="isGenerating || acceptedCards.length === 0"
					:loading="isInserting"
					data-testid="board-ai-insert-btn"
					@click="onInsert"
				>
					{{ t("components.board.ai.insert", { count: acceptedCards.length }) }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { notifyError } from "@data-app";
import { BoardAiPreset, BoardAiSource, useBoardAiCards, useBoardStore } from "@data-board";
import { RenderHTML } from "@feature-render-html";
import { mdiCreation } from "@icons/material";
import { computed, PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const PRESETS: BoardAiPreset[] = ["differentiate", "exercises", "simplify", "selfCheck", "free"];

const props = defineProps({
	source: {
		type: Object as PropType<BoardAiSource>,
		required: true,
	},
	/** where the accepted cards are created */
	targetColumnId: {
		type: String,
		required: true,
	},
});

const isOpen = defineModel({ type: Boolean, required: true });

const { t } = useI18n();
const boardStore = useBoardStore();
const { cards, generate, hasFailed, insert, isEmpty, isGenerating, isInserting, reset } = useBoardAiCards();

const preset = ref<BoardAiPreset>("differentiate");
const prompt = ref("");
const declined = ref<number[]>([]);

const isAccepted = (index: number) => !declined.value.includes(index);
const acceptedCards = computed(() => cards.value.filter((_card, index) => isAccepted(index)));

const toggle = (index: number) => {
	declined.value = isAccepted(index) ? [...declined.value, index] : declined.value.filter((item) => item !== index);
};

watch(isOpen, (open) => {
	if (open) {
		reset();
		declined.value = [];
	}
});

const onGenerate = async () => {
	declined.value = [];
	await generate(props.source, preset.value, prompt.value.trim());
};

const onInsert = async () => {
	const isComplete = await insert(props.targetColumnId, acceptedCards.value);
	if (!isComplete) notifyError(t("components.board.ai.insertError"));

	await boardStore.reloadBoard();
	isOpen.value = false;
};

const onClose = () => reset();
</script>
