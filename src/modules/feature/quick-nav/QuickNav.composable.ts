import { MIN_QUERY_LENGTH, useQuickNavApi } from "./QuickNavApi.composable";
import { useQuickNavEntries } from "./QuickNavEntries.composable";
import { QuickNavEntry, QuickNavGroup, QuickNavKind } from "./types";
import { useDebounceFn } from "@vueuse/core";
import { computed, ComputedRef, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

/** shared, so the topbar button, the ⌘K shortcut and the dialog all mean the same palette */
const isOpen = ref(false);

/**
 * Same rule as the server's: nothing when the query does not occur, otherwise how good the hit is.
 * Keeping the two in step matters because the palette sorts server and local entries into one list.
 */
const fold = (value: string): string =>
	value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

export const score = (title: string, query: string): number => {
	const haystack = fold(title);
	const needle = fold(query);
	const at = haystack.indexOf(needle);

	if (at < 0) return 0;
	if (at === 0) return 3;
	if (/[\s\-_/(]/.test(haystack.charAt(at - 1))) return 2;

	return 1;
};

const byQuery = (entries: QuickNavEntry[], query: string): QuickNavEntry[] => {
	if (query.length === 0) return entries;

	return entries
		.map((entry): [number, QuickNavEntry] => [score(entry.title, query), entry])
		.filter(([hit]) => hit > 0)
		.sort(([a], [b]) => b - a)
		.map(([, entry]) => entry);
};

/** How many pages to offer before anything is typed — enough to be useful, short enough to scan. */
const SUGGESTION_COUNT = 5;

export const useQuickNav = () => {
	const { t } = useI18n();
	const { navigationEntries, actionEntries } = useQuickNavEntries();
	const { results, isSearching, hasFailed, search, reset } = useQuickNavApi();

	const query = ref("");
	const selectedId = ref<string | undefined>(undefined);

	const trimmedQuery = computed(() => query.value.trim());

	const groups: ComputedRef<QuickNavGroup[]> = computed(() => {
		const q = trimmedQuery.value;

		const navigation =
			q.length === 0 ? navigationEntries.value.slice(0, SUGGESTION_COUNT) : byQuery(navigationEntries.value, q);
		const actions = q.length === 0 ? [] : byQuery(actionEntries.value, q);

		const found = results.value;
		const rooms = found.filter((entry) => entry.kind !== QuickNavKind.PERSON);
		const people = found.filter((entry) => entry.kind === QuickNavKind.PERSON);

		return [
			{ label: t("feature.quickNav.group.navigation"), entries: navigation },
			{ label: t("feature.quickNav.group.roomsAndCourses"), entries: rooms },
			{ label: t("feature.quickNav.group.people"), entries: people },
			{ label: t("feature.quickNav.group.actions"), entries: actions },
		].filter((group) => group.entries.length > 0);
	});

	/** the groups laid out end to end, which is the order the arrow keys walk */
	const flatEntries: ComputedRef<QuickNavEntry[]> = computed(() => groups.value.flatMap((group) => group.entries));

	const selectedEntry = computed(
		() => flatEntries.value.find((entry) => entry.id === selectedId.value) ?? flatEntries.value[0]
	);

	const moveSelection = (offset: number): void => {
		const entries = flatEntries.value;
		if (entries.length === 0) return;

		const current = entries.findIndex((entry) => entry.id === selectedEntry.value?.id);
		const next = (current + offset + entries.length) % entries.length;
		selectedId.value = entries[next].id;
	};

	const select = (id: string): void => {
		selectedId.value = id;
	};

	const open = (): void => {
		isOpen.value = true;
	};

	const close = (): void => {
		isOpen.value = false;
		query.value = "";
		selectedId.value = undefined;
		reset();
	};

	const toggle = (): void => {
		if (isOpen.value) {
			close();
		} else {
			open();
		}
	};

	/**
	 * Long enough that a fast typist causes one request instead of eight, short enough that the
	 * results feel like they belong to what is on screen.
	 */
	const debouncedSearch = useDebounceFn((value: string) => search(value), 200);

	watch(trimmedQuery, (value) => {
		// a new query invalidates the old selection, so the first hit is highlighted again
		selectedId.value = undefined;

		if (value.length < MIN_QUERY_LENGTH) {
			reset();
			return;
		}

		void debouncedSearch(value);
	});

	return {
		isOpen,
		query,
		groups,
		flatEntries,
		selectedEntry,
		isSearching,
		hasFailed,
		moveSelection,
		select,
		open,
		close,
		toggle,
	};
};
