<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="nostr-search-title">{{ t("pages.nostrSearch.title") }}</h1>
			<p class="text-medium-emphasis mb-0">{{ t("pages.nostrSearch.subtitle") }}</p>
		</template>

		<form class="d-flex align-start ga-2 flex-wrap" data-testid="nostr-search-form" @submit.prevent="runSearch">
			<VTextField
				v-model="query"
				:label="t('pages.nostrSearch.searchLabel')"
				:prepend-inner-icon="mdiMagnify"
				variant="outlined"
				density="comfortable"
				clearable
				class="flex-grow-1"
				data-testid="nostr-search-input"
			/>
			<VBtn
				type="submit"
				color="primary"
				size="large"
				:loading="isSearching"
				:disabled="isSearching"
				data-testid="nostr-search-submit"
			>
				{{ t("pages.nostrSearch.searchAction") }}
			</VBtn>
		</form>

		<VChipGroup v-model="mode" mandatory selected-class="text-primary" data-testid="nostr-search-mode">
			<VChip value="resources" variant="outlined" data-testid="nostr-search-mode-resources">
				{{ t("pages.nostrSearch.mode.resources") }}
			</VChip>
			<VChip value="notes" variant="outlined" data-testid="nostr-search-mode-notes">
				{{ t("pages.nostrSearch.mode.notes") }}
			</VChip>
			<VChip value="profiles" variant="outlined" data-testid="nostr-search-mode-profiles">
				{{ t("pages.nostrSearch.mode.profiles") }}
			</VChip>
		</VChipGroup>

		<div class="mt-4">
			<NostrRelayPanel :relay-states="relayStates" />
		</div>

		<VAlert type="info" variant="tonal" class="mt-4" density="compact" data-testid="nostr-search-disclaimer">
			{{ t("pages.nostrSearch.disclaimer") }}
		</VAlert>

		<VAlert v-if="errorKey" type="error" variant="tonal" class="mt-4" data-testid="nostr-search-error">
			{{ t(errorKey) }}
		</VAlert>

		<div v-if="isSearching" class="nostr-results mt-6" data-testid="nostr-search-loading">
			<VSkeletonLoader v-for="index in 4" :key="index" type="list-item-avatar-three-line" class="rounded-lg" />
		</div>

		<template v-else-if="results.length > 0">
			<p class="text-body-2 text-medium-emphasis mt-6 mb-2" data-testid="nostr-search-result-count">
				{{ t("pages.nostrSearch.resultCount", { count: results.length }) }}
			</p>
			<div class="nostr-results" data-testid="nostr-search-results">
				<NostrResultCard v-for="result in results" :key="result.id" :result="result" @add-to-board="openBoardDialog" />
			</div>
		</template>

		<VAlert
			v-else-if="hasSearched && !errorKey"
			type="info"
			variant="tonal"
			class="mt-4"
			data-testid="nostr-search-empty"
		>
			{{ t("pages.nostrSearch.empty") }}
		</VAlert>

		<NostrBoardDialog v-model="isBoardDialogOpen" :result="selectedResult" @added="onAddedToBoard" />

		<VSnackbar v-model="showsBoardSuccess" :timeout="8000" color="success" data-testid="nostr-board-success">
			{{ t("pages.nostrSearch.board.success") }}
			<template #actions>
				<VBtn variant="text" :to="`/boards/${addedBoardId}`" data-testid="nostr-board-success-link">
					{{ t("pages.nostrSearch.board.open") }}
				</VBtn>
			</template>
		</VSnackbar>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import {
	NostrBoardDialog,
	NostrRelayPanel,
	NostrResultCard,
	NostrSearchResult,
	useNostrSearch,
} from "@feature-nostr-search";
import { mdiMagnify } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const { query, mode, results, relayStates, isSearching, hasSearched, errorKey, search } = useNostrSearch({
	locale: locale.value,
});

useTitle(buildPageTitle(t("pages.nostrSearch.title")));

const runSearch = () => search();

// Switching between resources, notes and profiles is a different question about the same term, so
// it should answer itself — but only once there is a search to repeat.
watch(mode, () => {
	if (hasSearched.value && query.value.trim().length > 0) search();
});

const isBoardDialogOpen = ref(false);
const selectedResult = ref<NostrSearchResult | null>(null);
const addedBoardId = ref<string | undefined>(undefined);
const showsBoardSuccess = ref(false);

const openBoardDialog = (result: NostrSearchResult) => {
	selectedResult.value = result;
	isBoardDialogOpen.value = true;
};

const onAddedToBoard = (boardId: string) => {
	addedBoardId.value = boardId;
	showsBoardSuccess.value = true;
};
</script>

<style scoped>
.nostr-results {
	display: grid;
	gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	align-items: start;
}
</style>
