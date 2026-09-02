import { isNostrEvent } from "./nostr-event";
import { NostrEvent, NostrFilter } from "./types";

/**
 * A minimal NIP-01 relay client: open a WebSocket, ask one question, take the answers, close.
 *
 * Relays speak a tiny line protocol, so this stays a single file instead of a dependency:
 *   → ["REQ", <subscription>, <filter>]     ask
 *   ← ["EVENT", <subscription>, <event>]    one hit, repeated
 *   ← ["EOSE", <subscription>]              that was all of them
 *   ← ["CLOSED", <subscription>, <reason>]  the relay refused or ended the subscription
 *   → ["CLOSE", <subscription>]             we are done listening
 *
 * A query never rejects. One dead relay out of four must not lose the other three's hits, so the
 * outcome per relay is data — the UI shows which relay failed instead of failing the search.
 */

export interface RelayQueryOptions {
	/** How long to wait for EOSE before settling with whatever arrived. */
	timeoutMs?: number;
	/** Hard cap, so a relay that ignores `limit` cannot stream indefinitely. */
	maxEvents?: number;
	/** Seam for tests — production always uses the platform WebSocket. */
	createWebSocket?: (url: string) => WebSocket;
}

export interface RelayQueryResult {
	url: string;
	events: NostrEvent[];
	/** i18n key describing why this relay contributed nothing. */
	errorKey?: string;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_EVENTS = 200;

const createSubscriptionId = (): string => {
	const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

	return `svs-${random}`.slice(0, 64);
};

export const queryRelay = (
	url: string,
	filter: NostrFilter,
	options: RelayQueryOptions = {}
): Promise<RelayQueryResult> => {
	const { timeoutMs = DEFAULT_TIMEOUT_MS, maxEvents = DEFAULT_MAX_EVENTS, createWebSocket } = options;

	return new Promise<RelayQueryResult>((resolve) => {
		const events: NostrEvent[] = [];
		const subscriptionId = createSubscriptionId();
		let settled = false;
		let socket: WebSocket;

		try {
			socket = createWebSocket ? createWebSocket(url) : new WebSocket(url);
		} catch {
			resolve({ url, events, errorKey: "pages.nostrSearch.relay.error.unreachable" });

			return;
		}

		const timer = setTimeout(() => {
			// A silent relay is not an error as long as it sent hits; only an empty timeout is.
			settle(events.length > 0 ? undefined : "pages.nostrSearch.relay.error.timeout");
		}, timeoutMs);

		function settle(errorKey?: string): void {
			if (settled) return;
			settled = true;
			clearTimeout(timer);

			try {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify(["CLOSE", subscriptionId]));
				}
				socket.close();
			} catch {
				// The socket is being abandoned anyway; a failure to close it politely is moot.
			}

			resolve({ url, events, errorKey });
		}

		socket.onopen = () => {
			try {
				socket.send(JSON.stringify(["REQ", subscriptionId, filter]));
			} catch {
				settle("pages.nostrSearch.relay.error.unreachable");
			}
		};

		socket.onmessage = (message: MessageEvent) => {
			// A relay may keep talking after we stopped listening; the answer is already out.
			if (settled || typeof message.data !== "string") return;

			let payload: unknown;
			try {
				payload = JSON.parse(message.data);
			} catch {
				return;
			}

			if (!Array.isArray(payload) || typeof payload[0] !== "string") return;
			const [type, subscription] = payload as [string, string];
			if (subscription !== subscriptionId) return;

			if (type === "EVENT" && isNostrEvent(payload[2])) {
				events.push(payload[2]);
				if (events.length >= maxEvents) settle();

				return;
			}

			if (type === "EOSE") {
				settle();

				return;
			}

			if (type === "CLOSED") {
				// Relays close a subscription they cannot serve — for us that is usually a relay
				// without NIP-50 search rejecting the `search` field outright.
				settle(events.length > 0 ? undefined : "pages.nostrSearch.relay.error.rejected");
			}
		};

		socket.onerror = () => settle(events.length > 0 ? undefined : "pages.nostrSearch.relay.error.unreachable");

		socket.onclose = () => settle(events.length > 0 ? undefined : "pages.nostrSearch.relay.error.unreachable");
	});
};
