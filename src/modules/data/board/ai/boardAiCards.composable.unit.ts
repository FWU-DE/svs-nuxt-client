import { useBoardAiCards } from "./boardAiCards.composable";
import { mockApi, mockApiResponse, mountComposable } from "@@/tests/test-utils";
import {
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	CardResponse,
	Colors,
	ContentElementType,
	RichTextElementResponse,
} from "@api-server";
import { logger } from "@util-logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@api-server");
vi.mock("@/utils/api", () => ({ $axios: { defaults: { baseURL: "/api" } } }));

describe("boardAiCards.composable", () => {
	const encoder = new TextEncoder();
	const fetchMock = vi.fn();

	const cardApiMock = mockApi<ReturnType<typeof BoardCardApiFactory>>();
	const columnApiMock = mockApi<ReturnType<typeof BoardColumnApiFactory>>();
	const elementApiMock = mockApi<ReturnType<typeof BoardElementApiFactory>>();

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

	beforeEach(() => {
		vi.mocked(BoardCardApiFactory).mockReturnValue(cardApiMock);
		vi.mocked(BoardColumnApiFactory).mockReturnValue(columnApiMock);
		vi.mocked(BoardElementApiFactory).mockReturnValue(elementApiMock);
		columnApiMock.columnControllerCreateCard.mockResolvedValue(
			mockApiResponse<CardResponse>({ data: { id: "card-1" } as CardResponse })
		);
		cardApiMock.cardControllerCreateElement.mockResolvedValue(
			mockApiResponse<RichTextElementResponse>({ data: { id: "element-1" } as RichTextElementResponse })
		);
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	const setup = () => mountComposable(() => useBoardAiCards());

	describe("generate", () => {
		it("should ask the endpoint of the source", async () => {
			fetchMock.mockResolvedValue(streamResponse([]));
			const composable = setup();

			await composable.generate({ kind: "column", id: "column-7" }, "exercises");

			expect(fetchMock).toHaveBeenCalledWith(
				"/api/v3/columns/column-7/ai-cards",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ preset: "exercises", prompt: "" }),
				})
			);
		});

		it("should collect the streamed cards", async () => {
			fetchMock.mockResolvedValue(
				streamResponse([
					'{"type":"card","title":"Basis","color":"red","elements":[{"kind":"text","text":"<p>Los</p>"}]}\n',
					'{"type":"card","title":"Vertiefung","elements":[]}\n',
				])
			);
			const composable = setup();

			await composable.generate({ kind: "card", id: "card-9" }, "differentiate");

			expect(composable.cards.value).toEqual([
				{ title: "Basis", color: Colors.RED, elements: [{ kind: "text", text: "<p>Los</p>" }] },
				{ title: "Vertiefung", color: undefined, elements: [] },
			]);
		});

		it("should report a failing request", async () => {
			vi.spyOn(logger, "error").mockImplementation(vi.fn());
			fetchMock.mockResolvedValue({ ok: false, status: 403, body: null } as Response);
			const composable = setup();

			await composable.generate({ kind: "card", id: "card-9" }, "simplify");

			expect(composable.hasFailed.value).toBe(true);
			expect(composable.isGenerating.value).toBe(false);
		});
	});

	describe("insert", () => {
		it("should create the accepted cards in the column", async () => {
			const composable = setup();

			const isComplete = await composable.insert("column-7", [
				{
					title: "Basis",
					color: Colors.RED,
					elements: [
						{ kind: "text", text: "<p>Los</p>" },
						{ kind: "link", title: "Serlo", url: "https://de.serlo.org" },
					],
				},
			]);

			expect(isComplete).toBe(true);
			expect(columnApiMock.columnControllerCreateCard).toHaveBeenCalledWith("column-7", {});
			expect(cardApiMock.cardControllerUpdateCardTitle).toHaveBeenCalledWith("card-1", { title: "Basis" });
			expect(cardApiMock.cardControllerUpdateCardColor).toHaveBeenCalledWith("card-1", {
				backgroundColor: Colors.RED,
			});
			expect(cardApiMock.cardControllerCreateElement).toHaveBeenCalledWith("card-1", {
				type: ContentElementType.RICH_TEXT,
			});
			expect(cardApiMock.cardControllerCreateElement).toHaveBeenCalledWith("card-1", {
				type: ContentElementType.LINK,
			});
			expect(elementApiMock.elementControllerUpdateElement).toHaveBeenCalledWith("element-1", {
				data: {
					type: ContentElementType.LINK,
					content: { url: "https://de.serlo.org", title: "Serlo" },
				},
			});
		});

		it("should report when a card could not be created", async () => {
			vi.spyOn(logger, "error").mockImplementation(vi.fn());
			columnApiMock.columnControllerCreateCard.mockRejectedValue(new Error("Network error"));
			const composable = setup();

			const isComplete = await composable.insert("column-7", [{ title: "Basis", elements: [] }]);

			expect(isComplete).toBe(false);
			expect(composable.isInserting.value).toBe(false);
		});
	});
});
