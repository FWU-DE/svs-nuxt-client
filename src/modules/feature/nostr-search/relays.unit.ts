import { DEFAULT_NOSTR_RELAYS, isValidRelayUrl, normalizeRelayUrl, useNostrRelaySettings } from "./relays";

describe("relays", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe("isValidRelayUrl", () => {
		it.each([
			["wss://relay.example", true],
			["wss://relay.example/nostr", true],
			// Plain WebSocket would be mixed content on an https client.
			["ws://relay.example", false],
			["https://relay.example", false],
			["relay.example", false],
			["", false],
		])("judges %s", (value, expected) => {
			expect(isValidRelayUrl(value)).toBe(expected);
		});
	});

	it("normalises trailing slashes and whitespace", () => {
		expect(normalizeRelayUrl("  wss://relay.example//  ")).toBe("wss://relay.example");
	});

	it("starts with the built-in search relays", () => {
		const { relays, enabledRelayUrls } = useNostrRelaySettings();

		expect(relays.value.map((relay) => relay.url)).toEqual([...DEFAULT_NOSTR_RELAYS]);
		expect(enabledRelayUrls.value).toHaveLength(DEFAULT_NOSTR_RELAYS.length);
	});

	it("adds a relay once", () => {
		const { addRelay, relays } = useNostrRelaySettings();

		expect(addRelay("wss://relay.schule.example/")).toBe(true);
		expect(addRelay("wss://relay.schule.example")).toBe(false);
		expect(addRelay("nope")).toBe(false);
		expect(relays.value.filter((relay) => relay.url === "wss://relay.schule.example")).toHaveLength(1);
	});

	it("switching a relay off takes it out of the search", () => {
		const { toggleRelay, enabledRelayUrls } = useNostrRelaySettings();
		const [first] = DEFAULT_NOSTR_RELAYS;

		toggleRelay(first, false);

		expect(enabledRelayUrls.value).not.toContain(first);
	});

	it("removes and resets", () => {
		const { removeRelay, resetRelays, relays } = useNostrRelaySettings();
		const [first] = DEFAULT_NOSTR_RELAYS;

		removeRelay(first);
		expect(relays.value.map((relay) => relay.url)).not.toContain(first);

		resetRelays();
		expect(relays.value.map((relay) => relay.url)).toEqual([...DEFAULT_NOSTR_RELAYS]);
	});

	it("falls back to the defaults when the stored list is unusable", () => {
		localStorage.setItem("nostr-search-relays", '[{"url":"not-a-relay","enabled":true}]');

		const { relays } = useNostrRelaySettings();

		expect(relays.value.map((relay) => relay.url)).toEqual([...DEFAULT_NOSTR_RELAYS]);
	});
});
