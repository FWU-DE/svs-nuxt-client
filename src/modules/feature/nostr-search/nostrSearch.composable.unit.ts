import { matchesSearchTerm, useNostrSearch } from "./nostrSearch.composable";
import { queryRelay, RelayQueryResult } from "./relay.client";
import { NostrEvent, NostrFilter } from "./types";

vi.mock("./relay.client", () => ({ queryRelay: vi.fn() }));

const queryRelayMock = vi.mocked(queryRelay);

const RELAY_A = "wss://a.example";
const RELAY_B = "wss://b.example";

const note = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
	id: "1".repeat(64),
	pubkey: "b".repeat(64),
	created_at: 1700000000,
	kind: 1,
	tags: [],
	content: "Unterricht über Mathematik",
	sig: "c".repeat(128),
	...overrides,
});

const profileEvent = (pubkey: string, metadata: Record<string, string>, id = "9".repeat(64)): NostrEvent =>
	note({ id, pubkey, kind: 0, content: JSON.stringify(metadata) });

/** Answers each relay call by kind, so a test only has to describe what a relay knows. */
const answerWith = (byRelay: Record<string, { notes?: NostrEvent[]; profiles?: NostrEvent[]; errorKey?: string }>) => {
	queryRelayMock.mockImplementation((url: string, filter: NostrFilter): Promise<RelayQueryResult> => {
		const answer = byRelay[url] ?? {};
		const events = filter.kinds?.includes(0) ? (answer.profiles ?? []) : (answer.notes ?? []);

		return Promise.resolve({ url, events, errorKey: answer.errorKey });
	});
};

describe("useNostrSearch", () => {
	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem(
			"nostr-search-relays",
			JSON.stringify([
				{ url: RELAY_A, enabled: true },
				{ url: RELAY_B, enabled: true },
			])
		);
		queryRelayMock.mockReset();
		// Without WebCrypto the id check passes through, which keeps the fixtures readable.
		vi.stubGlobal("crypto", { randomUUID: () => "test-subscription" });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("matchesSearchTerm", () => {
		it("keeps a note that contains one of the terms", () => {
			expect(matchesSearchTerm(note(), "mathematik unterricht", "notes")).toBe(true);
		});

		it("drops a note that contains none of them", () => {
			expect(matchesSearchTerm(note({ content: "Kuchenrezept" }), "mathematik", "notes")).toBe(false);
		});

		it("matches profiles against their metadata", () => {
			const event = profileEvent("b".repeat(64), { display_name: "Frau Meyer", about: "Mathematik" });

			expect(matchesSearchTerm(event, "meyer", "profiles")).toBe(true);
			expect(matchesSearchTerm(event, "chemie", "profiles")).toBe(false);
		});
	});

	it("refuses a query that is too short to be a search", async () => {
		const { query, search, errorKey } = useNostrSearch();
		query.value = "a";

		await search();

		expect(errorKey.value).toBe("pages.nostrSearch.error.tooShort");
		expect(queryRelayMock).not.toHaveBeenCalled();
	});

	it("refuses to search when every relay is switched off", async () => {
		localStorage.setItem("nostr-search-relays", JSON.stringify([{ url: RELAY_A, enabled: false }]));
		const { query, search, errorKey } = useNostrSearch();
		query.value = "mathematik";

		await search();

		expect(errorKey.value).toBe("pages.nostrSearch.error.noRelays");
	});

	it("merges the same event from several relays into one hit", async () => {
		answerWith({ [RELAY_A]: { notes: [note()] }, [RELAY_B]: { notes: [note()] } });
		const { query, mode, search, results } = useNostrSearch();
		query.value = "mathematik";
		mode.value = "notes";

		await search();

		expect(results.value).toHaveLength(1);
		expect(results.value[0].relays).toEqual([RELAY_A, RELAY_B]);
		expect(results.value[0].noteRef?.startsWith("note1")).toBe(true);
		expect(results.value[0].externalUrl).toContain("njump.me");
	});

	it("sorts hits by recency", async () => {
		answerWith({
			[RELAY_A]: {
				notes: [
					note({ id: "1".repeat(64), created_at: 1700000000 }),
					note({ id: "2".repeat(64), created_at: 1800000000 }),
				],
			},
		});
		const { query, mode, search, results } = useNostrSearch();
		query.value = "mathematik";
		mode.value = "notes";

		await search();

		expect(results.value.map((result) => result.id)).toEqual(["2".repeat(64), "1".repeat(64)]);
	});

	it("marks a relay that ignored the search term instead of padding the results", async () => {
		answerWith({
			[RELAY_A]: { notes: [note()] },
			[RELAY_B]: { notes: [note({ id: "3".repeat(64), content: "Kuchenrezept" })] },
		});
		const { query, mode, search, results, relayStates } = useNostrSearch();
		query.value = "mathematik";
		mode.value = "notes";

		await search();

		expect(results.value).toHaveLength(1);
		expect(relayStates.value).toEqual([
			{ url: RELAY_A, phase: "done", matches: 1, errorKey: undefined },
			{ url: RELAY_B, phase: "no-search-support", matches: 0, errorKey: undefined },
		]);
	});

	it("adds the author profile to a note hit", async () => {
		answerWith({
			[RELAY_A]: {
				notes: [note()],
				profiles: [profileEvent("b".repeat(64), { display_name: "Frau Meyer", nip05: "meyer@schule.example" })],
			},
		});
		const { query, mode, search, results } = useNostrSearch();
		query.value = "mathematik";
		mode.value = "notes";

		await search();

		expect(results.value[0].author.profile?.displayName).toBe("Frau Meyer");
		expect(results.value[0].author.npub?.startsWith("npub1")).toBe(true);
	});

	it("searches profiles when asked for profiles", async () => {
		answerWith({
			[RELAY_A]: { profiles: [profileEvent("b".repeat(64), { display_name: "Frau Meyer", about: "Mathematik" })] },
		});
		const { query, mode, search, results } = useNostrSearch();
		query.value = "meyer";
		mode.value = "profiles";

		await search();

		expect(results.value).toHaveLength(1);
		expect(results.value[0].kind).toBe(0);
		expect(results.value[0].content).toBe("Mathematik");
		// A profile hit links to the person, not to an event.
		expect(results.value[0].externalUrl).toContain("npub1");
	});

	it("reads a learning resource out of its AMB tags", async () => {
		const resourceEvent = note({
			id: "5".repeat(64),
			kind: 30142,
			content: "",
			tags: [
				["d", "https://oer.example/mathe-kurs"],
				["name", "Mathematik Vorkurs"],
				["description", "Einführung in die höhere Mathematik."],
				["image", "https://oer.example/cover.png"],
				["about:prefLabel:de", "Mathematik"],
				["about:prefLabel:en", "Mathematics"],
				["learningResourceType:prefLabel:de", "Kurs"],
				["creator:name", "Frau Meyer"],
				["publisher:name", "OER Schule"],
				["license:id", "https://creativecommons.org/licenses/by-sa/4.0/"],
				["isAccessibleForFree", "true"],
				["t", "Analysis"],
			],
		});
		queryRelayMock.mockImplementation((url: string, filter: NostrFilter) =>
			Promise.resolve({ url, events: filter.kinds?.includes(30142) ? [resourceEvent] : [] })
		);

		const { query, search, results } = useNostrSearch();
		query.value = "mathematik";

		await search();

		const [hit] = results.value;
		expect(hit.title).toBe("Mathematik Vorkurs");
		expect(hit.content).toBe("Einführung in die höhere Mathematik.");
		// A resource links to the resource, not to a Nostr viewer.
		expect(hit.externalUrl).toBe("https://oer.example/mathe-kurs");
		expect(hit.resource?.subjects).toEqual(["Mathematik"]);
		expect(hit.resource?.resourceTypes).toEqual(["Kurs"]);
		expect(hit.resource?.licenseLabel).toBe("CC BY-SA 4.0");
		expect(hit.resource?.creators).toEqual(["Frau Meyer"]);
		expect(hit.hashtags).toEqual(["Analysis"]);
	});

	it("searches learning resources by default", async () => {
		queryRelayMock.mockResolvedValue({ url: RELAY_A, events: [] });
		const { query, search } = useNostrSearch();
		query.value = "mathematik";

		await search();

		expect(queryRelayMock).toHaveBeenCalledWith(RELAY_A, expect.objectContaining({ kinds: [30142] }), {});
	});

	it("reports when no relay answered", async () => {
		answerWith({
			[RELAY_A]: { errorKey: "pages.nostrSearch.relay.error.unreachable" },
			[RELAY_B]: { errorKey: "pages.nostrSearch.relay.error.timeout" },
		});
		const { query, search, errorKey, relayStates } = useNostrSearch();
		query.value = "mathematik";

		await search();

		expect(errorKey.value).toBe("pages.nostrSearch.error.allRelaysFailed");
		expect(relayStates.value.map((state) => state.phase)).toEqual(["failed", "failed"]);
	});
});
