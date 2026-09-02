import { hasMatchingEventId, isNostrEvent, parseProfile, profileSearchText, serializeEvent } from "./nostr-event";
import { NostrEvent } from "./types";

const validEvent = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
	id: "a".repeat(64),
	pubkey: "b".repeat(64),
	created_at: 1700000000,
	kind: 1,
	tags: [],
	content: "Hallo Nostr",
	sig: "c".repeat(128),
	...overrides,
});

describe("nostr-event", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("isNostrEvent", () => {
		it("accepts a well formed event", () => {
			expect(isNostrEvent(validEvent())).toBe(true);
		});

		it.each([
			["null", null],
			["a string", "event"],
			["a short id", { ...validEvent(), id: "abc" }],
			["a non hex pubkey", { ...validEvent(), pubkey: "z".repeat(64) }],
			["a missing timestamp", { ...validEvent(), created_at: undefined }],
			["tags that are not an array", { ...validEvent(), tags: "none" }],
		])("rejects %s", (_label, candidate) => {
			expect(isNostrEvent(candidate)).toBe(false);
		});
	});

	describe("serializeEvent", () => {
		it("follows the NIP-01 serialisation order", () => {
			expect(serializeEvent(validEvent({ tags: [["t", "schule"]] }))).toBe(
				`[0,"${"b".repeat(64)}",1700000000,1,[["t","schule"]],"Hallo Nostr"]`
			);
		});
	});

	describe("hasMatchingEventId", () => {
		const stubDigest = (byte: number) => {
			vi.stubGlobal("crypto", {
				subtle: {
					digest: () => Promise.resolve(new Uint8Array(32).fill(byte).buffer),
				},
			});
		};

		it("accepts an event whose id is the hash of its content", async () => {
			stubDigest(0xaa);

			await expect(hasMatchingEventId(validEvent({ id: "aa".repeat(32) }))).resolves.toBe(true);
		});

		it("rejects an event the relay tampered with", async () => {
			stubDigest(0xbb);

			await expect(hasMatchingEventId(validEvent({ id: "aa".repeat(32) }))).resolves.toBe(false);
		});

		it("accepts the event when no WebCrypto is available", async () => {
			vi.stubGlobal("crypto", {});

			await expect(hasMatchingEventId(validEvent())).resolves.toBe(true);
		});
	});

	describe("parseProfile", () => {
		it("reads the metadata fields it displays", () => {
			const profile = parseProfile(
				validEvent({
					kind: 0,
					content: JSON.stringify({
						name: "lehrerin",
						display_name: "Frau Meyer",
						about: " Unterricht und Unsinn ",
						nip05: "meyer@schule.example",
						picture: "https://example.org/a.png",
					}),
				})
			);

			expect(profile).toEqual({
				name: "lehrerin",
				displayName: "Frau Meyer",
				about: "Unterricht und Unsinn",
				nip05: "meyer@schule.example",
				picture: "https://example.org/a.png",
				website: undefined,
			});
		});

		it("returns an empty profile for malformed metadata", () => {
			expect(parseProfile(validEvent({ kind: 0, content: "not json" }))).toEqual({});
		});
	});

	describe("profileSearchText", () => {
		it("joins the fields a profile search matches against", () => {
			expect(profileSearchText({ displayName: "Frau Meyer", nip05: "meyer@schule.example" })).toBe(
				"Frau Meyer meyer@schule.example"
			);
		});
	});
});
