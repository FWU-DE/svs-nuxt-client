import { useBoardAiTemplate } from "./boardAiTemplate.composable";
import { mountComposable } from "@@/tests/test-utils";
import { BoardLayout, Colors } from "@api-server";
import { logger } from "@util-logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/api", () => ({ $axios: { defaults: { baseURL: "/api" } } }));

describe("boardAiTemplate.composable", () => {
	const encoder = new TextEncoder();

	const streamResponse = (chunks: string[]) =>
		({
			ok: true,
			status: 201,
			body: new ReadableStream<Uint8Array>({
				start(controller) {
					chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
					controller.close();
				},
			}),
		}) as Response;

	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	const setup = () => mountComposable(() => useBoardAiTemplate());

	it("should post the prompt to the ai endpoint of the room", async () => {
		fetchMock.mockResolvedValue(streamResponse([]));
		const composable = setup();

		await composable.generate("room-id", "Bruchrechnung");

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/v3/rooms/room-id/ai-board",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ prompt: "Bruchrechnung" }) })
		);
	});

	it("should send the number of columns when one is given", async () => {
		fetchMock.mockResolvedValue(streamResponse([]));
		const composable = setup();

		await composable.generate("room-id", "Bruchrechnung", { maxColumns: 4 });

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/v3/rooms/room-id/ai-board",
			expect.objectContaining({ body: JSON.stringify({ prompt: "Bruchrechnung", maxColumns: 4 }) })
		);
	});

	it("should build the board from the streamed items, also when a line is split over chunks", async () => {
		fetchMock.mockResolvedValue(
			streamResponse([
				'{"type":"board","title":"Brüche","layout":"columns"}\n{"type":"column","ti',
				'tle":"Woche 1"}\n{"type":"card","title":"Ziele","color":"teal","elements":[{"kind":"text","text":"<p>Los</p>"}]}\n',
				'{"type":"column","title":"Woche 2"}\n{"type":"card","title":"Material","elements":[{"kind":"folder","title":"Arbeitsblätter"},{"kind":"collaborative"}]}\n',
			])
		);
		const composable = setup();

		await composable.generate("room-id", "Brüche");

		expect(composable.board.value).toEqual({
			title: "Brüche",
			layout: BoardLayout.COLUMNS,
			columns: [
				{
					title: "Woche 1",
					cards: [{ title: "Ziele", color: Colors.TEAL, elements: [{ kind: "text", text: "<p>Los</p>" }] }],
				},
				{
					title: "Woche 2",
					cards: [
						{
							title: "Material",
							color: undefined,
							elements: [{ kind: "folder", title: "Arbeitsblätter" }, { kind: "collaborative" }],
						},
					],
				},
			],
		});
		expect(composable.hasFailed.value).toBe(false);
		expect(composable.isGenerating.value).toBe(false);
	});

	it("should take a list layout over", async () => {
		fetchMock.mockResolvedValue(streamResponse(['{"type":"board","title":"Plan","layout":"list"}\n']));
		const composable = setup();

		await composable.generate("room-id", "Plan");

		expect(composable.board.value?.layout).toBe(BoardLayout.LIST);
	});

	it("should keep to the first board when the stream sends another one", async () => {
		fetchMock.mockResolvedValue(
			streamResponse([
				'{"type":"board","title":"Erster","layout":"columns"}\n{"type":"column","title":"A"}\n',
				'{"type":"board","title":"Zweiter","layout":"columns"}\n{"type":"column","title":"B"}\n',
			])
		);
		const composable = setup();

		await composable.generate("room-id", "Plan");

		expect(composable.board.value?.title).toBe("Erster");
		expect(composable.board.value?.columns.map((column) => column.title)).toEqual(["A", "B"]);
	});

	it("should keep what arrived and report the failure when the stream ends with an error", async () => {
		fetchMock.mockResolvedValue(
			streamResponse([
				'{"type":"board","title":"Plan","layout":"columns"}\n{"type":"column","title":"A"}\n{"type":"error"}\n',
			])
		);
		const composable = setup();

		await composable.generate("room-id", "Plan");

		expect(composable.hasFailed.value).toBe(true);
		expect(composable.board.value?.columns).toHaveLength(1);
	});

	it("should report a failing request", async () => {
		vi.spyOn(logger, "error").mockImplementation(vi.fn());
		fetchMock.mockResolvedValue({ ok: false, status: 400, body: null } as Response);
		const composable = setup();

		await composable.generate("room-id", "Plan");

		expect(composable.hasFailed.value).toBe(true);
		expect(composable.isBudgetExceeded.value).toBe(false);
		expect(composable.isForbidden.value).toBe(false);
		expect(composable.isGenerating.value).toBe(false);
	});

	it("should tell a used up budget apart from other failures", async () => {
		vi.spyOn(logger, "error").mockImplementation(vi.fn());
		fetchMock.mockResolvedValue({ ok: false, status: 429, body: null } as Response);
		const composable = setup();

		await composable.generate("room-id", "Plan");

		expect(composable.hasFailed.value).toBe(true);
		expect(composable.isBudgetExceeded.value).toBe(true);
	});

	it("should tell a missing permission apart from other failures", async () => {
		vi.spyOn(logger, "error").mockImplementation(vi.fn());
		fetchMock.mockResolvedValue({ ok: false, status: 403, body: null } as Response);
		const composable = setup();

		await composable.generate("room-id", "Plan");

		expect(composable.hasFailed.value).toBe(true);
		expect(composable.isForbidden.value).toBe(true);
	});

	it("should not report a cancelled request as a failure", async () => {
		fetchMock.mockImplementation(
			(_url: string, init: { signal?: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
				})
		);
		const composable = setup();

		const running = composable.generate("room-id", "Plan");
		expect(composable.isGenerating.value).toBe(true);
		composable.cancel();
		await running;

		expect(composable.isGenerating.value).toBe(false);
		expect(composable.hasFailed.value).toBe(false);
	});

	it("should forget a previous suggestion on reset", async () => {
		fetchMock.mockResolvedValue(streamResponse(['{"type":"board","title":"Plan","layout":"columns"}\n']));
		const composable = setup();
		await composable.generate("room-id", "Plan");

		composable.reset();

		expect(composable.isEmpty.value).toBe(true);
		expect(composable.board.value).toBeUndefined();
	});
});
