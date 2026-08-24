import { $axios } from "@/utils/api";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

export interface ContentSearchResult {
	title: string;
	description: string;
	url: string;
	provider: string;
	license: string;
	resourceType: string;
	educationalLevel: string;
	subjects: string[];
}

/**
 * Searches open educational material. The server asks the amb relay and oersi for us, so the
 * client only has to hand over what the teacher is looking for.
 */
export const useContentSearch = () => {
	const results = ref<ContentSearchResult[]>([]);
	const isSearching = ref(false);
	const hasFailed = ref(false);
	const hasSearched = ref(false);

	const isEmpty = computed(() => results.value.length === 0);

	const search = async (query: string, limit = 6) => {
		isSearching.value = true;
		hasFailed.value = false;
		results.value = [];

		try {
			const params = new URLSearchParams({ query, limit: String(limit) });
			const response = await fetch(`${$axios.defaults.baseURL ?? ""}/v3/content-search?${params.toString()}`, {
				credentials: "same-origin",
			});

			if (!response.ok) throw new Error(`content search failed: ${response.status}`);

			const payload = (await response.json()) as { data: ContentSearchResult[] };
			results.value = payload.data;
		} catch (error) {
			hasFailed.value = true;
			logger.error("Could not search for educational material", error);
		} finally {
			hasSearched.value = true;
			isSearching.value = false;
		}
	};

	const reset = () => {
		results.value = [];
		hasFailed.value = false;
		hasSearched.value = false;
	};

	return {
		hasFailed,
		hasSearched,
		isEmpty,
		isSearching,
		reset,
		results,
		search,
	};
};
