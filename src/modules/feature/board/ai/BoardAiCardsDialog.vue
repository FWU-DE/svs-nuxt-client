<template>
	<VDialog v-model="isOpen" max-width="680" scrollable data-testid="board-ai-dialog" @after-leave="onClose">
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
				<VChipGroup v-model="mode" mandatory selected-class="text-primary" class="mb-2">
					<VChip
						v-for="option in MODES"
						:key="option"
						:value="option"
						:data-testid="`board-ai-preset-${option}`"
						:disabled="isBusy"
						filter
						variant="outlined"
					>
						{{ t(`components.board.ai.preset.${option}`) }}
					</VChip>
				</VChipGroup>
				<p class="text-body-2 text-medium-emphasis mb-4">{{ t(`components.board.ai.preset.${mode}.hint`) }}</p>

				<VTextarea
					v-if="mode === 'free'"
					v-model="prompt"
					:label="t('components.board.ai.prompt.label')"
					:placeholder="t('components.board.ai.prompt.placeholder')"
					:disabled="isBusy"
					rows="2"
					auto-grow
					counter="1000"
					:maxlength="1000"
					hide-details="auto"
					class="mb-4"
					data-testid="board-ai-prompt"
				/>

				<VTextField
					v-if="isSearchMode"
					v-model="query"
					:label="t('components.board.ai.search.label')"
					:placeholder="t('components.board.ai.search.placeholder')"
					:disabled="isBusy"
					hide-details="auto"
					class="mb-4"
					data-testid="board-ai-query"
					@keydown.enter.prevent="onStart"
				/>

				<VAlert v-if="hasFailed || searchFailed" type="error" variant="tonal" class="mb-4" data-testid="board-ai-error">
					{{ isSearchMode ? t("components.board.ai.search.error") : t("components.board.ai.error") }}
				</VAlert>

				<VProgressLinear v-if="isBusy" indeterminate color="primary" class="mb-4" />

				<!-- suggested cards -->
				<div v-if="!isSearchMode && cards.length > 0" class="d-flex flex-column ga-2">
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

				<!-- found material -->
				<div v-if="isSearchMode && results.length > 0" class="d-flex flex-column ga-2">
					<p class="text-caption text-medium-emphasis">
						{{ t("components.board.ai.search.relays", { relays: relays.join(", ") }) }}
					</p>
					<VSheet
						v-for="(result, index) in results"
						:key="index"
						border
						rounded
						class="pa-3"
						:data-testid="`board-ai-result-${index}`"
					>
						<VCheckbox
							:model-value="isAccepted(index)"
							density="compact"
							hide-details
							:data-testid="`board-ai-result-checkbox-${index}`"
							@update:model-value="toggle(index)"
						>
							<template #label>
								<span class="font-weight-bold">{{ result.title }}</span>
							</template>
						</VCheckbox>
						<div class="ml-8">
							<p v-if="result.description" class="text-body-2 mb-1">{{ result.description }}</p>
							<div class="d-flex flex-wrap ga-1">
								<VChip v-if="result.resourceType" size="x-small" variant="tonal">{{ result.resourceType }}</VChip>
								<VChip v-if="result.educationalLevel" size="x-small" variant="tonal">
									{{ result.educationalLevel }}
								</VChip>
								<VChip v-if="result.license" size="x-small" variant="tonal">{{ result.license }}</VChip>
								<VChip v-if="result.provider" size="x-small" variant="tonal">{{ result.provider }}</VChip>
							</div>
						</div>
					</VSheet>
				</div>

				<p
					v-if="isSearchMode && hasSearched && !isSearching && results.length === 0 && !searchFailed"
					class="text-body-2 text-medium-emphasis"
					data-testid="board-ai-search-empty"
				>
					{{ t("components.board.ai.search.empty") }}
				</p>
			</VCardText>

			<VCardActions>
				<VBtn variant="text" data-testid="board-ai-cancel-btn" @click="isOpen = false">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VSpacer />
				<VBtn
					variant="text"
					color="primary"
					:loading="isBusy"
					:disabled="isSearchMode && query.trim().length < 2"
					data-testid="board-ai-generate-btn"
					@click="onStart"
				>
					{{ startLabel }}
				</VBtn>
				<VBtn
					variant="flat"
					color="primary"
					:disabled="isBusy || acceptedCards.length === 0"
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
import { Colors } from "@api-server";
import { notifyError } from "@data-app";
import {
	BoardAiCard,
	BoardAiPreset,
	BoardAiSource,
	useBoardAiCards,
	useBoardStore,
	useContentSearch,
} from "@data-board";
import { RenderHTML } from "@feature-render-html";
import { mdiCreation } from "@icons/material";
import { computed, PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

/** the presets of the ai plus the search, which asks a catalogue instead of a model */
type BoardAiMode = BoardAiPreset | "material";

const MODES: BoardAiMode[] = ["differentiate", "exercises", "simplify", "selfCheck", "free", "material"];

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
	/** what the source is about, used as the first search term */
	sourceTitle: {
		type: String,
		default: "",
	},
});

const isOpen = defineModel({ type: Boolean, required: true });

const { t } = useI18n();
const boardStore = useBoardStore();
const { cards, generate, hasFailed, insert, isGenerating, isInserting, reset } = useBoardAiCards();
const {
	hasFailed: searchFailed,
	hasSearched,
	isSearching,
	relays,
	reset: resetSearch,
	results,
	search,
} = useContentSearch();

const mode = ref<BoardAiMode>("differentiate");
const prompt = ref("");
const query = ref("");
const declined = ref<number[]>([]);

const isSearchMode = computed(() => mode.value === "material");
const isBusy = computed(() => isGenerating.value || isSearching.value);

const startLabel = computed(() => {
	if (isSearchMode.value) return t("components.board.ai.search.button");

	return cards.value.length === 0 ? t("components.board.ai.generate") : t("components.board.ai.regenerate");
});

const isAccepted = (index: number) => !declined.value.includes(index);

/** found material becomes one card per result: the link, and the description above it */
const materialCards = computed<BoardAiCard[]>(() =>
	results.value.map((result) => ({
		title: result.title,
		color: Colors.BLUE,
		elements: [
			...(result.description
				? [{ kind: "text" as const, text: `<p>${result.description}</p><p>${result.license}</p>` }]
				: []),
			{ kind: "link" as const, title: result.title, url: result.url },
		],
	}))
);

const acceptedCards = computed(() =>
	(isSearchMode.value ? materialCards.value : cards.value).filter((_card, index) => isAccepted(index))
);

const toggle = (index: number) => {
	declined.value = isAccepted(index) ? [...declined.value, index] : declined.value.filter((item) => item !== index);
};

watch(mode, () => {
	declined.value = [];
	reset();
	resetSearch();
});

watch(
	() => props.sourceTitle,
	(title) => (query.value = title),
	{ immediate: true }
);

watch(isOpen, (open) => {
	if (open) {
		reset();
		resetSearch();
		declined.value = [];
		query.value = props.sourceTitle;
	}
});

const onStart = async () => {
	declined.value = [];

	if (isSearchMode.value) {
		await search(query.value.trim());
	} else {
		await generate(props.source, mode.value as BoardAiPreset, prompt.value.trim());
	}
};

const onInsert = async () => {
	const isComplete = await insert(props.targetColumnId, acceptedCards.value);
	if (!isComplete) notifyError(t("components.board.ai.insertError"));

	await boardStore.reloadBoard();
	isOpen.value = false;
};

const onClose = () => {
	reset();
	resetSearch();
};
</script>
