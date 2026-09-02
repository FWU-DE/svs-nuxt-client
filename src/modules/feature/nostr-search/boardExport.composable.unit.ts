import { buildCardHtml, buildCardTitle, useNostrBoardExport } from "./boardExport.composable";
import { NostrSearchResult } from "./types";
import { mockApi, mockApiResponse } from "@@/tests/test-utils";
import {
	boardResponseFactory,
	cardResponseFactory,
	columnResponseFactory,
	richTextElementResponseFactory,
} from "@@/tests/test-utils/factory";
import * as serverApi from "@api-server";
import { ContentElementType, LinkElementResponse, RoomBoardItemResponse } from "@api-server";
import { Mocked } from "vitest";

const LABELS = { source: "Quelle", license: "Lizenz", via: "Gefunden über die Nostr-Suche", fallbackTitle: "Fund" };

const result = (overrides: Partial<NostrSearchResult> = {}): NostrSearchResult => ({
	id: "1".repeat(64),
	kind: 30142,
	author: { pubkey: "b".repeat(64) },
	title: "Mathematik Vorkurs",
	content: "Einführung in die höhere Mathematik.",
	createdAt: new Date("2026-08-25T10:00:00Z"),
	hashtags: [],
	relays: ["wss://amb-relay.edufeed.org"],
	externalUrl: "https://oer.example/mathe",
	resource: {
		title: "Mathematik Vorkurs",
		description: "Einführung in die höhere Mathematik.",
		url: "https://oer.example/mathe",
		imageUrl: "https://oer.example/cover.png",
		licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
		licenseLabel: "CC BY-SA 4.0",
		subjects: ["Mathematik"],
		resourceTypes: [],
		educationalLevels: [],
		audiences: [],
		creators: ["Frau Meyer"],
		publisher: "OER Schule",
		languages: ["de"],
		keywords: [],
		isFree: true,
	},
	...overrides,
});

describe("boardExport", () => {
	describe("buildCardTitle", () => {
		it("uses the resource title", () => {
			expect(buildCardTitle(result(), "Fund")).toBe("Mathematik Vorkurs");
		});

		it("falls back to the author, then to the given fallback", () => {
			expect(buildCardTitle(result({ title: undefined }), "Fund")).toBe("Fund");
			expect(
				buildCardTitle(
					result({ title: undefined, author: { pubkey: "b".repeat(64), profile: { displayName: "Frau Meyer" } } }),
					"Fund"
				)
			).toBe("Frau Meyer");
		});

		it("shortens a title the API would reject", () => {
			const title = buildCardTitle(result({ title: "a".repeat(200) }), "Fund");

			expect(title).toHaveLength(100);
			expect(title.endsWith("…")).toBe(true);
		});
	});

	describe("buildCardHtml", () => {
		it("carries description, credits, licence and source", () => {
			const html = buildCardHtml(result(), LABELS);

			expect(html).toContain("Einführung in die höhere Mathematik.");
			expect(html).toContain("Frau Meyer · OER Schule");
			expect(html).toContain("CC BY-SA 4.0");
			expect(html).toContain('href="https://oer.example/mathe"');
			expect(html).toContain("Gefunden über die Nostr-Suche");
		});

		it("escapes relay content instead of trusting it as markup", () => {
			const html = buildCardHtml(result({ content: '<img src=x onerror="alert(1)">' }), LABELS);

			expect(html).not.toContain("<img");
			expect(html).toContain("&lt;img");
		});
	});

	describe("useNostrBoardExport", () => {
		let boardApi: Mocked<serverApi.BoardApiInterface>;
		let columnApi: Mocked<serverApi.BoardColumnApiInterface>;
		let cardApi: Mocked<serverApi.BoardCardApiInterface>;
		let elementApi: Mocked<serverApi.BoardElementApiInterface>;
		let roomApi: Mocked<serverApi.RoomApiInterface>;

		beforeEach(() => {
			boardApi = mockApi<serverApi.BoardApiInterface>();
			columnApi = mockApi<serverApi.BoardColumnApiInterface>();
			cardApi = mockApi<serverApi.BoardCardApiInterface>();
			elementApi = mockApi<serverApi.BoardElementApiInterface>();
			roomApi = mockApi<serverApi.RoomApiInterface>();

			vi.spyOn(serverApi, "BoardApiFactory").mockReturnValue(boardApi);
			vi.spyOn(serverApi, "BoardColumnApiFactory").mockReturnValue(columnApi);
			vi.spyOn(serverApi, "BoardCardApiFactory").mockReturnValue(cardApi);
			vi.spyOn(serverApi, "BoardElementApiFactory").mockReturnValue(elementApi);
			vi.spyOn(serverApi, "RoomApiFactory").mockReturnValue(roomApi);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		const withBoard = (columnIds: string[]) => {
			const columns = columnIds.map((id) => columnResponseFactory.build({ id }));
			boardApi.boardControllerGetBoardSkeleton.mockResolvedValue(
				mockApiResponse({ data: boardResponseFactory.build({ columns }) })
			);
			boardApi.boardControllerCreateColumn.mockResolvedValue(
				mockApiResponse({ data: columnResponseFactory.build({ id: "new-column" }) })
			);
			columnApi.columnControllerCreateCard.mockResolvedValue(
				mockApiResponse({
					data: cardResponseFactory.build({
						id: "card-1",
						elements: [richTextElementResponseFactory.build({ id: "text-1" })],
					}),
				})
			);
			cardApi.cardControllerUpdateCardTitle.mockResolvedValue(mockApiResponse({}));
			cardApi.cardControllerCreateElement.mockResolvedValue(
				mockApiResponse({ data: { id: "link-1" } as LinkElementResponse })
			);
			elementApi.elementControllerUpdateElement.mockResolvedValue(mockApiResponse({}));
		};

		it("only offers boards the user may put content on", async () => {
			roomApi.roomControllerGetRoomBoards.mockResolvedValue(
				mockApiResponse({
					data: {
						data: [
							{ id: "board-1", title: "Mit Rechten", allowedOperations: { relocateContent: true } },
							{ id: "board-2", title: "Nur lesen", allowedOperations: { relocateContent: false } },
						] as RoomBoardItemResponse[],
					} as serverApi.RoomBoardListResponse,
				})
			);

			const { loadBoards, boards } = useNostrBoardExport();
			await loadBoards("room-1");

			expect(boards.value.map((board) => board.id)).toEqual(["board-1"]);
		});

		it("creates a card with a text element and a link element", async () => {
			withBoard(["column-1"]);
			const { addToBoard } = useNostrBoardExport();

			await expect(addToBoard(result(), "board-1", LABELS)).resolves.toBe(true);

			expect(columnApi.columnControllerCreateCard).toHaveBeenCalledWith("column-1", expect.anything());
			expect(cardApi.cardControllerUpdateCardTitle).toHaveBeenCalledWith("card-1", { title: "Mathematik Vorkurs" });
			expect(elementApi.elementControllerUpdateElement).toHaveBeenCalledWith(
				"text-1",
				expect.objectContaining({ data: expect.objectContaining({ type: ContentElementType.RICH_TEXT }) })
			);
			expect(cardApi.cardControllerCreateElement).toHaveBeenCalledWith("card-1", {
				type: ContentElementType.LINK,
			});
			expect(elementApi.elementControllerUpdateElement).toHaveBeenCalledWith(
				"link-1",
				expect.objectContaining({
					data: expect.objectContaining({
						content: expect.objectContaining({ url: "https://oer.example/mathe" }),
					}),
				})
			);
		});

		it("creates a column first when the board is empty", async () => {
			withBoard([]);
			const { addToBoard } = useNostrBoardExport();

			await addToBoard(result(), "board-1", LABELS);

			expect(boardApi.boardControllerCreateColumn).toHaveBeenCalledWith("board-1");
			expect(columnApi.columnControllerCreateCard).toHaveBeenCalledWith("new-column", expect.anything());
		});

		it("skips the link element for a hit without a web address", async () => {
			withBoard(["column-1"]);
			const { addToBoard } = useNostrBoardExport();

			await addToBoard(result({ externalUrl: undefined }), "board-1", LABELS);

			expect(cardApi.cardControllerCreateElement).not.toHaveBeenCalled();
		});

		it("reports a failure instead of throwing at the caller", async () => {
			boardApi.boardControllerGetBoardSkeleton.mockRejectedValue(new Error("403"));
			const { addToBoard, errorKey } = useNostrBoardExport();

			await expect(addToBoard(result(), "board-1", LABELS)).resolves.toBe(false);
			expect(errorKey.value).toBe("pages.nostrSearch.board.error.add");
		});
	});
});
