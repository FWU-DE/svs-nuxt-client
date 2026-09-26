/**
 * The Nostr protocol vocabulary this feature needs, and nothing more.
 *
 * Nostr events are plain JSON objects that relays hand out over a WebSocket (NIP-01). We only
 * ever read them, so there is no signing, no key handling and no local identity involved.
 */

/** Kinds we query. Nostr defines many more; these are the two that carry searchable text. */
export const NOSTR_KIND_PROFILE = 0;
export const NOSTR_KIND_NOTE = 1;

/** A raw event exactly as a relay sends it. */
export interface NostrEvent {
	id: string;
	pubkey: string;
	created_at: number;
	kind: number;
	tags: string[][];
	content: string;
	sig: string;
}

/** A NIP-01 subscription filter. `search` is the NIP-50 extension — not every relay honours it. */
export interface NostrFilter {
	ids?: string[];
	authors?: string[];
	kinds?: number[];
	search?: string;
	since?: number;
	until?: number;
	limit?: number;
}

/** The profile fields (kind 0) we display. The rest of the metadata object is ignored. */
export interface NostrProfile {
	name?: string;
	displayName?: string;
	about?: string;
	picture?: string;
	nip05?: string;
	website?: string;
}

export interface NostrResource {
	title: string;
	description?: string;
	/** The resource itself — this is what a board card should link to. */
	url?: string;
	imageUrl?: string;
	licenseUrl?: string;
	/** Short form such as "CC BY-SA 4.0", when the licence URL is a known one. */
	licenseLabel?: string;
	subjects: string[];
	resourceTypes: string[];
	educationalLevels: string[];
	audiences: string[];
	creators: string[];
	publisher?: string;
	languages: string[];
	keywords: string[];
	isFree: boolean;
}

export interface NostrAuthor {
	pubkey: string;
	/** bech32 form (`npub1…`), absent if the pubkey is not valid hex. */
	npub?: string;
	profile?: NostrProfile;
}

/** One search hit, normalised so notes and profiles render through the same card. */
export interface NostrSearchResult {
	/** Event id (hex) — also the de-duplication key across relays. */
	id: string;
	kind: number;
	author: NostrAuthor;
	/** Note text, or the profile's "about" text, or the resource description. */
	content: string;
	/** Headline of a learning resource; notes and profiles have none. */
	title?: string;
	/** The AMB metadata behind a learning-resource hit. */
	resource?: NostrResource;
	createdAt: Date;
	/** bech32 event reference (`note1…`), for links and copying. */
	noteRef?: string;
	/** Hashtags the author put on the event (`t` tags), for the topic chips. */
	hashtags: string[];
	/** Where the hit came from — the same event usually arrives from several relays. */
	relays: string[];
	/** Public web viewer for this event, or undefined when no bech32 reference exists. */
	externalUrl?: string;
}

export type NostrRelayPhase = "idle" | "searching" | "done" | "failed" | "no-search-support";

/** Per-relay outcome of the last search, shown so an unreachable relay is visible, not silent. */
export interface NostrRelayState {
	url: string;
	phase: NostrRelayPhase;
	/** Hits this relay contributed after filtering. */
	matches: number;
	/** i18n key describing the failure, set only when `phase === "failed"`. */
	errorKey?: string;
}

export interface NostrRelayConfig {
	url: string;
	enabled: boolean;
}
