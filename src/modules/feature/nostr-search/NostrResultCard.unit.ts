import NostrResultCard from "./NostrResultCard.vue";
import { NostrSearchResult } from "./types";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

const resourceResult = (overrides: Partial<NostrSearchResult> = {}): NostrSearchResult => ({
	id: "1".repeat(64),
	kind: 30142,
	author: { pubkey: "b".repeat(64) },
	title: "Mathematik Vorkurs",
	content: "Einführung in die höhere Mathematik.",
	createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
	hashtags: [],
	relays: ["wss://amb-relay.edufeed.org"],
	externalUrl: "https://oer.example/mathe",
	resource: {
		title: "Mathematik Vorkurs",
		description: "Einführung in die höhere Mathematik.",
		url: "https://oer.example/mathe",
		imageUrl: "https://oer.example/cover.png",
		licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
		licenseLabel: "CC BY-SA 4.0",
		subjects: ["Mathematik"],
		resourceTypes: ["Kurs"],
		educationalLevels: ["Sekundarstufe"],
		audiences: [],
		creators: ["Frau Meyer"],
		publisher: "OER Schule",
		languages: ["de"],
		keywords: [],
		isFree: true,
	},
	...overrides,
});

const noteResult = (overrides: Partial<NostrSearchResult> = {}): NostrSearchResult => ({
	id: "2".repeat(64),
	kind: 1,
	author: { pubkey: "b".repeat(64), npub: "npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq" },
	content: "Eine gewöhnliche Notiz.",
	createdAt: new Date(),
	hashtags: ["schule"],
	relays: ["wss://relay.example"],
	externalUrl: "https://njump.me/note1test",
	noteRef: "note1test",
	...overrides,
});

const setup = (result: NostrSearchResult) =>
	mount(NostrResultCard, {
		props: { result },
		global: { plugins: [createTestingVuetify(), createTestingI18n()] },
	});

describe("NostrResultCard", () => {
	describe("a learning resource", () => {
		it("shows title, description, topics and licence", () => {
			const wrapper = setup(resourceResult());

			expect(wrapper.find("[data-testid='nostr-result-title']").text()).toBe("Mathematik Vorkurs");
			expect(wrapper.find("[data-testid='nostr-result-content']").text()).toContain("höhere Mathematik");
			expect(wrapper.findAll("[data-testid='nostr-result-tag']").map((tag) => tag.text())).toEqual([
				"Mathematik",
				"Sekundarstufe",
			]);
			expect(wrapper.find("[data-testid='nostr-result-license']").text()).toBe("CC BY-SA 4.0");
			expect(wrapper.find("[data-testid='nostr-result-free']").exists()).toBe(true);
			expect(wrapper.find("[data-testid='nostr-result-credits']").text()).toBe("Frau Meyer · OER Schule");
		});

		it("links the title to the resource in a new tab", () => {
			const link = setup(resourceResult()).find("[data-testid='nostr-result-title']");

			expect(link.attributes("href")).toBe("https://oer.example/mathe");
			expect(link.attributes("target")).toBe("_blank");
			expect(link.attributes("rel")).toContain("noopener");
		});

		it("drops a thumbnail URL that is not http(s)", () => {
			const result = resourceResult();
			const wrapper = setup({
				...result,
				resource: { ...result.resource!, imageUrl: "javascript:alert(1)" },
			});

			expect(wrapper.find("img").exists()).toBe(false);
		});
	});

	describe("a note", () => {
		it("falls back to the shortened key when there is no profile", () => {
			const wrapper = setup(noteResult());

			expect(wrapper.find("[data-testid='nostr-result-title']").text()).toContain("npub1");
			expect(wrapper.findAll("[data-testid='nostr-result-tag']").map((tag) => tag.text())).toEqual(["#schule"]);
		});

		it("prefers the profile name", () => {
			const wrapper = setup(noteResult({ author: { pubkey: "b".repeat(64), profile: { displayName: "Frau Meyer" } } }));

			expect(wrapper.find("[data-testid='nostr-result-title']").text()).toBe("Frau Meyer");
		});
	});

	it("asks the page to put the hit on a board", async () => {
		const wrapper = setup(resourceResult());

		await wrapper.find("[data-testid='nostr-result-add-to-board']").trigger("click");

		expect(wrapper.emitted("add-to-board")).toHaveLength(1);
	});
});
