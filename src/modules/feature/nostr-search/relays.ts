import { NostrRelayConfig } from "./types";
import { useLocalStorage } from "@vueuse/core";
import { computed } from "vue";

/**
 * Which relays the search asks.
 *
 * Nostr has no index and no central search endpoint: a search is only as good as the relays it
 * asks, and full-text search (NIP-50) is an optional extension that most relays do not implement.
 *
 * The defaults are the edufeed relays — the same ones the AMB/OERSI tooling uses. They carry
 * educational metadata (kind 30142) rather than general social notes, which is what this app has
 * any business searching. The list stays editable: a school running its own relay, or anyone who
 * wants to search ordinary notes, adds one without needing a release.
 */
export const DEFAULT_NOSTR_RELAYS: readonly string[] = [
	"wss://amb-relay.edufeed.org",
	"wss://oersi.edufeed.org",
	"wss://sodix.edufeed.org",
];

const STORAGE_KEY = "nostr-search-relays";

/** Encrypted transport only: the client is served over https, and ws:// would be blocked anyway. */
export const isValidRelayUrl = (value: string): boolean => {
	try {
		const url = new URL(value.trim());

		return url.protocol === "wss:" && url.hostname.length > 0;
	} catch {
		return false;
	}
};

export const normalizeRelayUrl = (value: string): string => value.trim().replace(/\/+$/, "");

const defaultConfigs = (): NostrRelayConfig[] => DEFAULT_NOSTR_RELAYS.map((url) => ({ url, enabled: true }));

export const useNostrRelaySettings = () => {
	const relays = useLocalStorage<NostrRelayConfig[]>(STORAGE_KEY, defaultConfigs(), {
		// A hand-edited or outdated entry must not take the whole search down with it.
		serializer: {
			read: (raw: string): NostrRelayConfig[] => {
				try {
					const parsed: unknown = JSON.parse(raw);
					if (!Array.isArray(parsed)) return defaultConfigs();

					const configs = parsed
						.filter(
							(entry): entry is NostrRelayConfig =>
								typeof entry === "object" &&
								entry !== null &&
								typeof (entry as NostrRelayConfig).url === "string" &&
								isValidRelayUrl((entry as NostrRelayConfig).url)
						)
						.map((entry) => ({ url: normalizeRelayUrl(entry.url), enabled: entry.enabled !== false }));

					return configs.length > 0 ? configs : defaultConfigs();
				} catch {
					return defaultConfigs();
				}
			},
			write: (value: NostrRelayConfig[]): string => JSON.stringify(value),
		},
	});

	const enabledRelayUrls = computed(() => relays.value.filter((relay) => relay.enabled).map((relay) => relay.url));

	const toggleRelay = (url: string, enabled: boolean): void => {
		relays.value = relays.value.map((relay) => (relay.url === url ? { ...relay, enabled } : relay));
	};

	const addRelay = (url: string): boolean => {
		const normalized = normalizeRelayUrl(url);
		if (!isValidRelayUrl(normalized)) return false;
		if (relays.value.some((relay) => relay.url === normalized)) return false;

		relays.value = [...relays.value, { url: normalized, enabled: true }];

		return true;
	};

	const removeRelay = (url: string): void => {
		relays.value = relays.value.filter((relay) => relay.url !== url);
	};

	const resetRelays = (): void => {
		relays.value = defaultConfigs();
	};

	return { relays, enabledRelayUrls, toggleRelay, addRelay, removeRelay, resetRelays };
};
