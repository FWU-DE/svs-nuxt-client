import NostrSearchPage from "./NostrSearch.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import type { NostrSearchResult } from "@feature-nostr-search";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { ref } from "vue";

const searchSpy = vi.fn();
const query = ref("");
const mode = ref<"notes" | "profiles">("notes");
const results = ref<NostrSearchResult[]>([]);
const relayStates = ref([]);
const isSearching = ref(false);
const hasSearched = ref(false);
const errorKey = ref<string | undefined>(undefined);

vi.mock("@feature-nostr-search", async (importOriginal) => ({
	...(await importOriginal<typeof import("@feature-nostr-search")>()),
	useNostrSearch: () => ({ query, mode, results, relayStates, isSearching, hasSearched, errorKey, search: searchSpy }),
}));

const result = (overrides: Partial<NostrSearchResult> = {}): NostrSearchResult => ({
	id: "1".repeat(64),
	kind: 1,
	author: { pubkey: "b".repeat(64), npub: "npub1test", profile: { displayName: "Frau Meyer" } },
	content: "Unterricht über Mathematik",
	createdAt: new Date("2026-08-25T10:00:00Z"),
	noteRef: "note1test",
	hashtags: [],
	relays: ["wss://a.example"],
	externalUrl: "https://njump.me/note1test",
	...overrides,
});

describe("NostrSearchPage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		localStorage.clear();
		searchSpy.mockClear();
		query.value = "";
		mode.value = "notes";
		results.value = [];
		isSearching.value = false;
		hasSearched.value = false;
		errorKey.value = undefined;
	});

	const setup = () =>
		mount(NostrSearchPage, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

	it("renders the search form and the disclaimer about unmoderated content", () => {
		const wrapper = setup();

		expect(wrapper.find("[data-testid='nostr-search-title']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='nostr-search-input']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='nostr-search-disclaimer']").exists()).toBe(true);
	});

	it("searches when the form is submitted", async () => {
		const wrapper = setup();
		query.value = "mathematik";

		await wrapper.find("[data-testid='nostr-search-form']").trigger("submit");

		expect(searchSpy).toHaveBeenCalled();
	});

	it("renders a card per hit", async () => {
		const wrapper = setup();
		results.value = [result(), result({ id: "2".repeat(64) })];
		await flushPromises();

		expect(wrapper.findAll("[data-testid^='nostr-result-']").length).toBeGreaterThanOrEqual(2);
		expect(wrapper.text()).toContain("Unterricht über Mathematik");
	});

	it("shows the empty state only after a search", async () => {
		const wrapper = setup();
		expect(wrapper.find("[data-testid='nostr-search-empty']").exists()).toBe(false);

		hasSearched.value = true;
		await flushPromises();

		expect(wrapper.find("[data-testid='nostr-search-empty']").exists()).toBe(true);
	});

	it("shows the error instead of the empty state", async () => {
		const wrapper = setup();
		hasSearched.value = true;
		errorKey.value = "pages.nostrSearch.error.allRelaysFailed";
		await flushPromises();

		expect(wrapper.find("[data-testid='nostr-search-error']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='nostr-search-empty']").exists()).toBe(false);
	});

	it("repeats the search when the mode changes after a search", async () => {
		setup();
		query.value = "mathematik";
		hasSearched.value = true;
		mode.value = "profiles";
		await flushPromises();

		expect(searchSpy).toHaveBeenCalled();
	});
});
