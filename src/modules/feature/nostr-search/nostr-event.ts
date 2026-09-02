import { NostrEvent, NostrProfile } from "./types";

/**
 * Shape checks and integrity checks for events coming off a relay.
 *
 * A relay is an untrusted source: anyone can run one, and it decides what to hand back. Two
 * guards are cheap and worth having — the payload must actually look like a Nostr event, and the
 * event id must be the hash of the event's own contents, so a relay cannot serve one id while
 * displaying different text under it.
 *
 * What we deliberately do *not* do is verify the Schnorr signature, which would prove the event
 * came from the claimed author. That needs a secp256k1 implementation; without it, treat the
 * author of a hit as "claimed by the relay", never as "verified".
 */

const HEX_64 = /^[0-9a-f]{64}$/i;

export const isNostrEvent = (value: unknown): value is NostrEvent => {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate.id === "string" &&
		HEX_64.test(candidate.id) &&
		typeof candidate.pubkey === "string" &&
		HEX_64.test(candidate.pubkey) &&
		typeof candidate.created_at === "number" &&
		Number.isFinite(candidate.created_at) &&
		typeof candidate.kind === "number" &&
		typeof candidate.content === "string" &&
		Array.isArray(candidate.tags)
	);
};

/** The exact byte sequence NIP-01 hashes to produce an event id. */
export const serializeEvent = (event: NostrEvent): string =>
	JSON.stringify([0, event.pubkey.toLowerCase(), event.created_at, event.kind, event.tags, event.content]);

const sha256Hex = async (input: string): Promise<string | undefined> => {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) return undefined;

	try {
		const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));

		return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	} catch {
		return undefined;
	}
};

/**
 * Whether the event id matches the event's contents.
 *
 * Returns `true` when hashing is unavailable (no WebCrypto, e.g. an insecure origin): the check
 * is a defence against a tampering relay, not a reason to show the user nothing at all.
 */
export const hasMatchingEventId = async (event: NostrEvent): Promise<boolean> => {
	const digest = await sha256Hex(serializeEvent(event));

	return digest === undefined || digest === event.id.toLowerCase();
};

/** Kind 0 events carry their metadata as a JSON string; malformed ones are simply empty profiles. */
export const parseProfile = (event: NostrEvent): NostrProfile => {
	try {
		const parsed: unknown = JSON.parse(event.content);
		if (typeof parsed !== "object" || parsed === null) return {};
		const metadata = parsed as Record<string, unknown>;

		const asText = (key: string): string | undefined => {
			const value = metadata[key];

			return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
		};

		return {
			name: asText("name"),
			displayName: asText("display_name") ?? asText("displayName"),
			about: asText("about"),
			picture: asText("picture"),
			nip05: asText("nip05"),
			website: asText("website"),
		};
	} catch {
		return {};
	}
};

/** The text a profile hit is matched and displayed against. */
export const profileSearchText = (profile: NostrProfile): string =>
	[profile.displayName, profile.name, profile.nip05, profile.about].filter(Boolean).join(" ");
