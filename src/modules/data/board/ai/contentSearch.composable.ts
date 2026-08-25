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

/** wss://amb-relay.edufeed.org -> AMB, so the caption reads like a name and not like an address */
const relayName = (relay: string): string =>
	(relay.split("//").pop() ?? relay).split(".")[0].replace("-relay", "").toUpperCase();

/**
 * Searches open educational material. The server asks the catalogues for us and answers with the
 * ones it asked, so the client only has to hand over what the teacher is looking for.
 */
export const useContentSearch = () => {
	const results = ref<ContentSearchResult[]>([]);
	const relays = ref<string[]>([]);
	const searchedFor = ref("");
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

			const payload = (await response.json()) as {
				data: ContentSearchResult[];
				relays?: string[];
				query?: string;
			};
			results.value = payload.data;
			relays.value = (payload.relays ?? []).map(relayName);
			// a question of several words is searched by its topic, and the teacher should see which
			searchedFor.value = payload.query !== undefined && payload.query !== query ? payload.query : "";
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
		relays.value = [];
		searchedFor.value = "";
		hasFailed.value = false;
		hasSearched.value = false;
	};

	return {
		hasFailed,
		hasSearched,
		isEmpty,
		isSearching,
		relays,
		reset,
		results,
		search,
		searchedFor,
	};
};
