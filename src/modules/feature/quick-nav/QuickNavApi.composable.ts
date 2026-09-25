import { QuickNavEntry, QuickNavKind } from "./types";
import { $axios } from "@/utils/api";
import { mdiAccountOutline, mdiAccountSupervisorCircleOutline, mdiSchoolOutline } from "@icons/material";
import { logger } from "@util-logger";
import { ref } from "vue";

type QuickSearchResultType = "room" | "course" | "person";

type QuickSearchResultResponse = {
	id: string;
	type: QuickSearchResultType;
	title: string;
	subtitle: string;
	url: string;
};

type QuickSearchListResponse = {
	data: QuickSearchResultResponse[];
	query: string;
};

const kindOf: Record<QuickSearchResultType, QuickNavKind> = {
	room: QuickNavKind.ROOM,
	course: QuickNavKind.COURSE,
	person: QuickNavKind.PERSON,
};

const iconOf: Record<QuickSearchResultType, string> = {
	room: mdiAccountSupervisorCircleOutline,
	course: mdiSchoolOutline,
	person: mdiAccountOutline,
};

/** The server refuses anything shorter, and a single letter would match half the school anyway. */
export const MIN_QUERY_LENGTH = 2;

/**
 * Asks the server for rooms, courses and people while the user types.
 *
 * Answers that belong to a query the user has already typed past are dropped, so a slow response to
 * "Bio" cannot overwrite the results for "Biologie" — which is what makes a palette feel broken.
 */
export const useQuickNavApi = () => {
	const results = ref<QuickNavEntry[]>([]);
	const isSearching = ref(false);
	const hasFailed = ref(false);

	/** the query whose answer is still wanted; anything else that comes back is stale */
	let awaiting = "";

	const reset = () => {
		awaiting = "";
		results.value = [];
		isSearching.value = false;
		hasFailed.value = false;
	};

	const search = async (query: string, limit = 10): Promise<void> => {
		const trimmed = query.trim();

		if (trimmed.length < MIN_QUERY_LENGTH) {
			reset();
			return;
		}

		awaiting = trimmed;
		isSearching.value = true;
		hasFailed.value = false;

		try {
			const { data } = await $axios.get<QuickSearchListResponse>("/v3/quick-search", {
				params: { query: trimmed, limit },
			});

			if (awaiting !== trimmed) return;

			results.value = data.data.map((result) => ({
				id: `${result.type}:${result.id}`,
				kind: kindOf[result.type],
				title: result.title,
				subtitle: result.subtitle || undefined,
				icon: iconOf[result.type],
				to: result.url,
			}));
		} catch (error) {
			if (awaiting !== trimmed) return;

			// the palette stays usable on its own entries, so this is not worth a notification
			hasFailed.value = true;
			results.value = [];
			logger.error("Quick navigation could not search rooms, courses and people", error);
		} finally {
			if (awaiting === trimmed) {
				isSearching.value = false;
			}
		}
	};

	return { results, isSearching, hasFailed, search, reset };
};
