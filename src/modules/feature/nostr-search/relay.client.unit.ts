import { queryRelay } from "./relay.client";
import { NostrEvent } from "./types";

const event = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
	id: "a".repeat(64),
	pubkey: "b".repeat(64),
	created_at: 1700000000,
	kind: 1,
	tags: [],
	content: "Hallo Nostr",
	sig: "c".repeat(128),
	...overrides,
});

class FakeSocket {
	public static instances: FakeSocket[] = [];
	public readyState = 0;
	public sent: string[] = [];
	public onopen: (() => void) | null = null;
	public onmessage: ((message: { data: unknown }) => void) | null = null;
	public onerror: (() => void) | null = null;
	public onclose: (() => void) | null = null;

	constructor(public readonly url: string) {
		FakeSocket.instances.push(this);
	}

	public send(data: string): void {
		this.sent.push(data);
	}

	public close(): void {
		this.readyState = 3;
	}

	public simulateOpen(): void {
		this.readyState = 1;
		this.onopen?.();
	}

	public simulateMessage(payload: unknown): void {
		this.onmessage?.({ data: JSON.stringify(payload) });
	}

	public get subscriptionId(): string {
		return JSON.parse(this.sent[0])[1];
	}
}

const setup = () => {
	FakeSocket.instances = [];
	const createWebSocket = (url: string) => new FakeSocket(url) as unknown as WebSocket;

	return { createWebSocket, socketOf: () => FakeSocket.instances[0] };
};

describe("queryRelay", () => {
	it("sends the filter as a REQ once the socket opens", async () => {
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1], search: "mathe" }, { createWebSocket });

		socketOf().simulateOpen();
		socketOf().simulateMessage(["EOSE", socketOf().subscriptionId]);
		await pending;

		expect(JSON.parse(socketOf().sent[0])).toEqual(["REQ", socketOf().subscriptionId, { kinds: [1], search: "mathe" }]);
	});

	it("collects events until the relay signals the end of stored events", async () => {
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1] }, { createWebSocket });

		socketOf().simulateOpen();
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, event({ id: "1".repeat(64) })]);
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, event({ id: "2".repeat(64) })]);
		socketOf().simulateMessage(["EOSE", socketOf().subscriptionId]);

		const result = await pending;

		expect(result.events.map((item) => item.id)).toEqual(["1".repeat(64), "2".repeat(64)]);
		expect(result.errorKey).toBeUndefined();
		expect(JSON.parse(socketOf().sent[1])).toEqual(["CLOSE", socketOf().subscriptionId]);
	});

	it("ignores messages belonging to another subscription and malformed events", async () => {
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1] }, { createWebSocket });

		socketOf().simulateOpen();
		socketOf().simulateMessage(["EVENT", "someone-else", event({ id: "1".repeat(64) })]);
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, { id: "too-short" }]);
		socketOf().simulateMessage(["EOSE", socketOf().subscriptionId]);

		await expect(pending).resolves.toMatchObject({ events: [] });
	});

	it("reports a rejected subscription", async () => {
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1] }, { createWebSocket });

		socketOf().simulateOpen();
		socketOf().simulateMessage(["CLOSED", socketOf().subscriptionId, "unsupported filter"]);

		await expect(pending).resolves.toMatchObject({ errorKey: "pages.nostrSearch.relay.error.rejected" });
	});

	it("keeps the events a relay already sent when it goes quiet", async () => {
		vi.useFakeTimers();
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1] }, { createWebSocket, timeoutMs: 1000 });

		socketOf().simulateOpen();
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, event()]);
		vi.advanceTimersByTime(1000);

		const result = await pending;
		vi.useRealTimers();

		expect(result.events).toHaveLength(1);
		expect(result.errorKey).toBeUndefined();
	});

	it("reports a timeout when nothing arrived at all", async () => {
		vi.useFakeTimers();
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1] }, { createWebSocket, timeoutMs: 1000 });

		socketOf().simulateOpen();
		vi.advanceTimersByTime(1000);

		const result = await pending;
		vi.useRealTimers();

		expect(result.errorKey).toBe("pages.nostrSearch.relay.error.timeout");
	});

	it("stops a relay that streams past the cap", async () => {
		const { createWebSocket, socketOf } = setup();
		const pending = queryRelay("wss://relay.example", { kinds: [1] }, { createWebSocket, maxEvents: 2 });

		socketOf().simulateOpen();
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, event({ id: "1".repeat(64) })]);
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, event({ id: "2".repeat(64) })]);
		socketOf().simulateMessage(["EVENT", socketOf().subscriptionId, event({ id: "3".repeat(64) })]);

		await expect(pending).resolves.toMatchObject({ events: [{ id: "1".repeat(64) }, { id: "2".repeat(64) }] });
	});

	it("reports an unreachable relay instead of throwing", async () => {
		const result = await queryRelay(
			"wss://relay.example",
			{ kinds: [1] },
			{
				createWebSocket: () => {
					throw new Error("blocked");
				},
			}
		);

		expect(result).toEqual({
			url: "wss://relay.example",
			events: [],
			errorKey: "pages.nostrSearch.relay.error.unreachable",
		});
	});
});
