import { encodeNoteId, encodePublicKey, hexToBytes, shortenBech32 } from "./nip19";

describe("nip19", () => {
	describe("encodePublicKey", () => {
		it("encodes the NIP-19 reference key", () => {
			// Test vector straight from the NIP-19 specification.
			expect(encodePublicKey("3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")).toBe(
				"npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"
			);
		});

		it("accepts upper case hex", () => {
			expect(encodePublicKey("3BF0C63FCB93463407AF97A5E5EE64FA883D107EF9E558472C4EB9AAAEFA459D")).toBe(
				"npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"
			);
		});

		it("rejects anything that is not a 32 byte key", () => {
			expect(encodePublicKey("abc")).toBeUndefined();
			expect(encodePublicKey(`${"z".repeat(64)}`)).toBeUndefined();
		});
	});

	describe("encodeNoteId", () => {
		it("produces a note reference of the expected shape", () => {
			const encoded = encodeNoteId("3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d");

			// "note1" + 52 data characters + 6 checksum characters.
			expect(encoded).toMatch(/^note1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$/);
		});
	});

	describe("hexToBytes", () => {
		it("converts pairs of hex digits", () => {
			expect(hexToBytes("00ff10")).toEqual([0, 255, 16]);
		});

		it("rejects odd length and non-hex input", () => {
			expect(hexToBytes("abc")).toBeUndefined();
			expect(hexToBytes("zz")).toBeUndefined();
		});
	});

	describe("shortenBech32", () => {
		it("keeps the prefix and trims the middle", () => {
			const shortened = shortenBech32("npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6");

			expect(shortened.startsWith("npub1")).toBe(true);
			expect(shortened).toContain("…");
			expect(shortened.length).toBeLessThan(30);
		});

		it("leaves short values untouched", () => {
			expect(shortenBech32("npub1abc")).toBe("npub1abc");
		});
	});
});
