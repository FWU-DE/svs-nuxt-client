import { AMB_KIND, parseResource, resourceSearchText } from "./amb";
import { encodeNoteId, encodePublicKey } from "./nip19";
import { hasMatchingEventId, parseProfile, profileSearchText } from "./nostr-event";
import { queryRelay, RelayQueryOptions } from "./relay.client";
import { useNostrRelaySettings } from "./relays";
import {
	NOSTR_KIND_NOTE,
	NOSTR_KIND_PROFILE,
	NostrAuthor,
	NostrEvent,
	NostrFilter,
	NostrProfile,
	NostrRelayState,
	NostrSearchResult,
} from "./types";
import { ref } from "vue";

/**
 * Runs one search across every enabled relay and merges the answers.
 *
 * Two things make this more than a fan-out. First, the same event arrives from several relays, so
 * hits are merged by event id and remember where they came from. Second, NIP-50 full-text search
 * is optional: a relay that does not implement it silently ignores the `search` field and answers
 * with its most recent notes instead. Those would look like results but match nothing, so every
 * hit is re-checked against the query on the client — and a relay whose entire answer fails that
 * check is reported as "no full-text search" rather than quietly padding the list.
 */

export type NostrSearchMode = "resources" | "notes" | "profiles";

export const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 50;
const PROFILE_LOOKUP_LIMIT = 40;
const EXTERNAL_VIEWER = "https://njump.me";

const searchTokens = (term: string): string[] =>
	term
		.toLowerCase()
		.split(/\s+/)
		.filter((token) => token.length > 1);

const searchableTextOf = (event: NostrEvent, mode: NostrSearchMode): string => {
	if (mode === "profiles") return profileSearchText(parseProfile(event));
	if (mode === "resources") return resourceSearchText(parseResource(event));

	return event.content;
};

/** Whether a hit really answers the query, or is just what an indifferent relay had lying around. */
export const matchesSearchTerm = (event: NostrEvent, term: string, mode: NostrSearchMode): boolean => {
	const tokens = searchTokens(term);
	if (tokens.length === 0) return true;

	const haystack = searchableTextOf(event, mode).toLowerCase();

	return tokens.some((token) => haystack.includes(token));
};

const kindOf = (mode: NostrSearchMode): number => {
	if (mode === "profiles") return NOSTR_KIND_PROFILE;
	if (mode === "resources") return AMB_KIND;

	return NOSTR_KIND_NOTE;
};

const buildFilter = (term: string, mode: NostrSearchMode): NostrFilter => ({
	kinds: [kindOf(mode)],
	search: term,
	limit: RESULT_LIMIT,
});

const toAuthor = (pubkey: string, profile?: NostrProfile): NostrAuthor => ({
	pubkey,
	npub: encodePublicKey(pubkey),
	profile,
});

const MAX_HASHTAGS = 6;

/** `["t", "schule"]` tags are the closest thing Nostr has to topics. */
const hashtagsOf = (event: NostrEvent): string[] =>
	[
		...new Set(
			event.tags
				.filter((tag) => tag[0] === "t" && typeof tag[1] === "string" && tag[1].trim().length > 0)
				.map((tag) => tag[1].trim())
		),
	].slice(0, MAX_HASHTAGS);

const toResult = (event: NostrEvent, relays: string[], locale: string, profile?: NostrProfile): NostrSearchResult => {
	const isProfile = event.kind === NOSTR_KIND_PROFILE;
	const isResource = event.kind === AMB_KIND;
	const ownProfile = isProfile ? parseProfile(event) : profile;
	const author = toAuthor(event.pubkey, ownProfile);
	const noteRef = isProfile ? undefined : encodeNoteId(event.id);
	const resource = isResource ? parseResource(event, locale) : undefined;

	// A learning resource points at the resource itself; anything else at a public Nostr viewer.
	const nostrReference = isProfile ? author.npub : noteRef;
	const externalUrl = resource?.url ?? (nostrReference ? `${EXTERNAL_VIEWER}/${nostrReference}` : undefined);

	const content = isProfile ? (ownProfile?.about ?? "") : (resource?.description ?? event.content);

	return {
		id: event.id,
		kind: event.kind,
		author,
		title: resource?.title,
		resource,
		content,
		createdAt: new Date(event.created_at * 1000),
		noteRef,
		hashtags: isResource ? resource!.keywords : isProfile ? [] : hashtagsOf(event),
		relays,
		externalUrl,
	};
};

/** Keeps the newest kind-0 event per author — profiles are replaceable, relays may hold old ones. */
const collectProfiles = async (
	relayUrls: string[],
	pubkeys: string[],
	options: RelayQueryOptions
): Promise<Map<string, NostrProfile>> => {
	const authors = pubkeys.slice(0, PROFILE_LOOKUP_LIMIT);
	if (authors.length === 0) return new Map();

	const answers = await Promise.all(
		relayUrls.map((url) =>
			queryRelay(url, { kinds: [NOSTR_KIND_PROFILE], authors, limit: authors.length * 2 }, options)
		)
	);

	const newest = new Map<string, NostrEvent>();
	answers
		.flatMap((answer) => answer.events)
		.filter((event) => event.kind === NOSTR_KIND_PROFILE && authors.includes(event.pubkey))
		.forEach((event) => {
			const current = newest.get(event.pubkey);
			if (!current || current.created_at < event.created_at) newest.set(event.pubkey, event);
		});

	return new Map([...newest].map(([pubkey, event]) => [pubkey, parseProfile(event)]));
};

export interface NostrSearchOptions extends RelayQueryOptions {
	/** Interface language, used to pick the right label of a vocabulary term. */
	locale?: string;
}

export const useNostrSearch = (options: NostrSearchOptions = {}) => {
	const { locale = "de", ...relayOptions } = options;
	const { enabledRelayUrls } = useNostrRelaySettings();

	const query = ref("");
	// Learning resources are what these relays carry, so that is where a search starts.
	const mode = ref<NostrSearchMode>("resources");
	const results = ref<NostrSearchResult[]>([]);
	const relayStates = ref<NostrRelayState[]>([]);
	const isSearching = ref(false);
	const hasSearched = ref(false);
	const errorKey = ref<string | undefined>(undefined);

	// Guards against an earlier, slower search overwriting the results of a later one.
	let currentRun = 0;

	const search = async (): Promise<void> => {
		const term = query.value.trim();
		const searchMode = mode.value;

		if (term.length < MIN_QUERY_LENGTH) {
			errorKey.value = "pages.nostrSearch.error.tooShort";
			results.value = [];
			relayStates.value = [];

			return;
		}

		const relayUrls = [...enabledRelayUrls.value];
		if (relayUrls.length === 0) {
			errorKey.value = "pages.nostrSearch.error.noRelays";
			results.value = [];
			relayStates.value = [];

			return;
		}

		const run = ++currentRun;
		isSearching.value = true;
		errorKey.value = undefined;
		relayStates.value = relayUrls.map((url) => ({ url, phase: "searching", matches: 0 }));

		try {
			const answers = await Promise.all(
				relayUrls.map((url) => queryRelay(url, buildFilter(term, searchMode), relayOptions))
			);
			if (run !== currentRun) return;

			const states: NostrRelayState[] = [];
			const merged = new Map<string, { event: NostrEvent; relays: string[] }>();

			for (const answer of answers) {
				const verified: NostrEvent[] = [];
				for (const event of answer.events) {
					if (await hasMatchingEventId(event)) verified.push(event);
				}

				const matching = verified.filter((event) => matchesSearchTerm(event, term, searchMode));

				matching.forEach((event) => {
					const existing = merged.get(event.id);
					if (existing) {
						if (!existing.relays.includes(answer.url)) existing.relays.push(answer.url);

						return;
					}
					merged.set(event.id, { event, relays: [answer.url] });
				});

				states.push({
					url: answer.url,
					phase: answer.errorKey
						? "failed"
						: verified.length > 0 && matching.length === 0
							? "no-search-support"
							: "done",
					matches: matching.length,
					errorKey: answer.errorKey,
				});
			}

			if (run !== currentRun) return;
			relayStates.value = states;

			const ordered = [...merged.values()]
				.sort((a, b) => b.event.created_at - a.event.created_at)
				.slice(0, RESULT_LIMIT);

			const profiles =
				searchMode === "notes"
					? await collectProfiles(relayUrls, [...new Set(ordered.map((hit) => hit.event.pubkey))], relayOptions)
					: new Map<string, NostrProfile>();
			if (run !== currentRun) return;

			results.value = ordered.map((hit) => toResult(hit.event, hit.relays, locale, profiles.get(hit.event.pubkey)));

			if (results.value.length === 0 && states.every((state) => state.phase === "failed")) {
				errorKey.value = "pages.nostrSearch.error.allRelaysFailed";
			}
		} finally {
			if (run === currentRun) {
				isSearching.value = false;
				hasSearched.value = true;
			}
		}
	};

	const reset = (): void => {
		currentRun++;
		query.value = "";
		results.value = [];
		relayStates.value = [];
		errorKey.value = undefined;
		hasSearched.value = false;
		isSearching.value = false;
	};

	return { query, mode, results, relayStates, isSearching, hasSearched, errorKey, search, reset };
};
