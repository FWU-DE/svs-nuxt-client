import { useRoomAiTemplate } from "./roomAiTemplate.composable";
import { mountComposable } from "@@/tests/test-utils";
import { BoardLayout, ContentElementType } from "@api-server";
import { logger } from "@util-logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/api", () => ({ $axios: { defaults: { baseURL: "/api" } } }));

describe("roomAiTemplate.composable", () => {
	const encoder = new TextEncoder();

	const streamResponse = (chunks: string[]) =>
		({
			ok: true,
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

	const setup = () => mountComposable(() => useRoomAiTemplate());

	it("should post the prompt to the ai endpoint", async () => {
		fetchMock.mockResolvedValue(streamResponse([]));
		const composable = setup();

		await composable.generate("Mathe 9b");

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/v3/rooms/ai-template",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ prompt: "Mathe 9b" }) })
		);
	});

	it("should build the structure from the streamed items", async () => {
		fetchMock.mockResolvedValue(
			streamResponse([
				'{"type":"roomName","name":"Mathe 9b"}\n{"type":"board","title":"Plan","layout":"list"}\n',
				'{"type":"column","title":"Woche 1"}\n{"type":"card","title":"Ziele","text":"<p>Los</p>"}\n',
			])
		);
		const composable = setup();

		await composable.generate("Mathe");

		expect(composable.roomName.value).toBe("Mathe 9b");
		expect(composable.boards.value).toEqual([
			{
				title: "Plan",
				layout: BoardLayout.LIST,
				columns: [
					{
						title: "Woche 1",
						cards: [
							{
								title: "Ziele",
								elements: [{ type: ContentElementType.RICH_TEXT, text: "<p>Los</p>" }],
							},
						],
					},
				],
			},
		]);
	});

	it("should keep a card without text empty", async () => {
		fetchMock.mockResolvedValue(
			streamResponse([
				'{"type":"board","title":"Plan","layout":"columns"}\n{"type":"column","title":"Material"}\n{"type":"card","title":"Links"}\n',
			])
		);
		const composable = setup();

		await composable.generate("Mathe");

		expect(composable.boards.value[0].columns[0].cards[0].elements).toEqual([]);
	});

	it("should ignore items that have no place to go", async () => {
		fetchMock.mockResolvedValue(streamResponse(['{"type":"column","title":"ohne Board"}\n']));
		const composable = setup();

		await composable.generate("Mathe");

		expect(composable.isEmpty.value).toBe(true);
	});

	it("should report a failing request", async () => {
		vi.spyOn(logger, "error").mockImplementation(vi.fn());
		fetchMock.mockResolvedValue({ ok: false, status: 500, body: null } as Response);
		const composable = setup();

		await composable.generate("Mathe");

		expect(composable.hasFailed.value).toBe(true);
		expect(composable.isGenerating.value).toBe(false);
	});

	it("should forget a previous suggestion on reset", async () => {
		fetchMock.mockResolvedValue(streamResponse(['{"type":"board","title":"Plan","layout":"columns"}\n']));
		const composable = setup();
		await composable.generate("Mathe");

		composable.reset();

		expect(composable.isEmpty.value).toBe(true);
		expect(composable.roomName.value).toBe("");
	});
});
