import { roomTemplates } from "./roomTemplates";
import { boardKey, cardKey, columnKey, useRoomTemplate } from "./roomTemplates.composable";
import { ResolvedBoard } from "./types";
import { mockApi, mockApiResponse, mountComposable } from "@@/tests/test-utils";
import {
	BoardApiFactory,
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	BoardLayout,
	BoardParentType,
	CardResponse,
	Colors,
	ColumnResponse,
	ContentElementType,
	CreateBoardResponse,
	RichTextElementResponse,
} from "@api-server";
import { logger } from "@util-logger";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@api-server");

describe("roomTemplates.composable", () => {
	const boardApiMock = mockApi<ReturnType<typeof BoardApiFactory>>();
	const columnApiMock = mockApi<ReturnType<typeof BoardColumnApiFactory>>();
	const cardApiMock = mockApi<ReturnType<typeof BoardCardApiFactory>>();
	const elementApiMock = mockApi<ReturnType<typeof BoardElementApiFactory>>();

	const idGenerator = <T>(prefix: string) => {
		let count = 0;
		return () => Promise.resolve(mockApiResponse<T>({ data: { id: `${prefix}-${++count}` } as T }));
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(BoardApiFactory).mockReturnValue(boardApiMock);
		vi.mocked(BoardColumnApiFactory).mockReturnValue(columnApiMock);
		vi.mocked(BoardCardApiFactory).mockReturnValue(cardApiMock);
		vi.mocked(BoardElementApiFactory).mockReturnValue(elementApiMock);

		boardApiMock.boardControllerCreateBoard.mockImplementation(idGenerator<CreateBoardResponse>("board"));
		boardApiMock.boardControllerCreateColumn.mockImplementation(idGenerator<ColumnResponse>("column"));
		boardApiMock.boardControllerUpdateVisibility.mockResolvedValue(mockApiResponse({ data: undefined }));
		columnApiMock.columnControllerCreateCard.mockImplementation(idGenerator<CardResponse>("card"));
		columnApiMock.columnControllerUpdateColumnTitle.mockResolvedValue(mockApiResponse({ data: undefined }));
		cardApiMock.cardControllerCreateElement.mockImplementation(idGenerator<RichTextElementResponse>("element"));
		cardApiMock.cardControllerUpdateCardTitle.mockResolvedValue(mockApiResponse({ data: undefined }));
		elementApiMock.elementControllerUpdateElement.mockImplementation(idGenerator<RichTextElementResponse>("element"));
	});

	const setup = () => mountComposable(() => useRoomTemplate());

	const singleBoard: ResolvedBoard[] = [
		{
			title: "Übersicht",
			layout: BoardLayout.COLUMNS,
			columns: [
				{
					title: "Material",
					cards: [
						{
							title: "Linksammlung",
							elements: [{ kind: "text", text: "<p>Dateien hochladen.</p>" }],
						},
					],
				},
			],
		},
	];

	describe("when there is nothing to create", () => {
		it("should not call the board api", async () => {
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", []);

			expect(isComplete).toBe(true);
			expect(boardApiMock.boardControllerCreateBoard).not.toHaveBeenCalled();
		});
	});

	describe("when a template is applied", () => {
		it("should create the board in the room", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoard);

			expect(boardApiMock.boardControllerCreateBoard).toHaveBeenCalledWith({
				title: "Übersicht",
				parentId: "room-id",
				parentType: BoardParentType.ROOM,
				layout: BoardLayout.COLUMNS,
			});
		});

		it("should create the columns and cards with their titles", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoard);

			expect(boardApiMock.boardControllerCreateColumn).toHaveBeenCalledWith("board-1");
			expect(columnApiMock.columnControllerUpdateColumnTitle).toHaveBeenCalledWith("column-1", {
				title: "Material",
			});
			expect(columnApiMock.columnControllerCreateCard).toHaveBeenCalledWith("column-1", {});
			expect(cardApiMock.cardControllerUpdateCardTitle).toHaveBeenCalledWith("card-1", {
				title: "Linksammlung",
			});
		});

		it("should fill the elements with the content of the template", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoard);

			expect(cardApiMock.cardControllerCreateElement).toHaveBeenCalledWith("card-1", {
				type: ContentElementType.RICH_TEXT,
			});
			expect(elementApiMock.elementControllerUpdateElement).toHaveBeenCalledWith("element-1", {
				data: {
					type: ContentElementType.RICH_TEXT,
					content: { text: "<p>Dateien hochladen.</p>", inputFormat: "richTextCk5" },
				},
			});
		});

		it("should publish the board, so that members of the room can see it", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoard);

			expect(boardApiMock.boardControllerUpdateVisibility).toHaveBeenCalledWith("board-1", { isVisible: true });
		});

		it("should report every created item, so that a preview can follow along", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoard);

			expect(composable.createdKeys.value).toEqual([boardKey(0), columnKey(0, 0), cardKey(0, 0, 0)]);
		});

		it("should report a complete run", async () => {
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", singleBoard);

			expect(isComplete).toBe(true);
			expect(composable.progress.value).toBe(100);
			expect(composable.isApplying.value).toBe(false);
		});
	});

	describe("when a card carries more than text", () => {
		const richBoards: ResolvedBoard[] = [
			{
				title: "Aktuelles",
				layout: BoardLayout.LIST,
				columns: [
					{
						title: "Ankündigungen",
						cards: [
							{
								title: "Material",
								color: Colors.TEAL,
								elements: [
									{ kind: "folder", title: "Materialordner" },
									{ kind: "drawing" },
									{ kind: "collaborative" },
									{ kind: "link", title: "Serlo", url: "https://de.serlo.org" },
									{ kind: "boardLink", title: "Zur Organisation", boardIndex: 1 },
									{ kind: "videoConference", title: "Sprechstunde" },
								],
							},
						],
					},
				],
			},
			{ title: "Organisation", layout: BoardLayout.COLUMNS, columns: [] },
		];

		it("should create every content type of the card", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", richBoards);

			const createdTypes = cardApiMock.cardControllerCreateElement.mock.calls.map((call) => call[1].type);
			expect(createdTypes).toEqual([
				ContentElementType.FILE_FOLDER,
				ContentElementType.DRAWING,
				ContentElementType.COLLABORATIVE_TEXT_EDITOR,
				ContentElementType.LINK,
				ContentElementType.LINK,
				ContentElementType.VIDEO_CONFERENCE,
			]);
		});

		it("should paint the card in the colour of the template", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", richBoards);

			expect(cardApiMock.cardControllerUpdateCardColor).toHaveBeenCalledWith("card-1", {
				backgroundColor: Colors.TEAL,
			});
		});

		it("should point a board link at the board it references", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", richBoards);

			// board-2 is the second board, which is created before any card exists
			expect(elementApiMock.elementControllerUpdateElement).toHaveBeenCalledWith("element-5", {
				data: {
					type: ContentElementType.LINK,
					content: { url: `${window.location.origin}/boards/board-2`, title: "Zur Organisation" },
				},
			});
		});

		it("should leave a drawing and a shared document empty", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", richBoards);

			const filledElements = elementApiMock.elementControllerUpdateElement.mock.calls.map((call) => call[0]);
			expect(filledElements).not.toContain("element-2");
			expect(filledElements).not.toContain("element-3");
		});

		it("should keep the card when one content type cannot be created", async () => {
			vi.spyOn(logger, "error").mockImplementation(vi.fn());
			cardApiMock.cardControllerCreateElement.mockRejectedValueOnce(new Error("not enabled here"));
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", richBoards);

			expect(isComplete).toBe(true);
			expect(cardApiMock.cardControllerCreateElement).toHaveBeenCalledTimes(6);
		});
	});

	describe("when a board cannot be created", () => {
		it("should report an incomplete run instead of throwing", async () => {
			vi.spyOn(logger, "error").mockImplementation(vi.fn());
			boardApiMock.boardControllerCreateBoard.mockRejectedValue(new Error("Network error"));
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", singleBoard);

			expect(isComplete).toBe(false);
			expect(composable.isApplying.value).toBe(false);
			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe("the catalog", () => {
		it("should offer the blank template first", () => {
			expect(roomTemplates[0].id).toBe("blank");
			expect(roomTemplates[0].boards).toHaveLength(0);
		});

		it("should only use unique ids", () => {
			const ids = roomTemplates.map((template) => template.id);

			expect(new Set(ids).size).toBe(ids.length);
		});

		it("should declare a param for every placeholder it uses", () => {
			roomTemplates.forEach((template) => {
				const declared = new Set([...template.params.map((param) => param.key), "index"]);
				const repeatParams = template.boards.flatMap((board) =>
					board.columns.flatMap((column) => [column.repeatParam, ...column.cards.map((card) => card.repeatParam)])
				);

				repeatParams.filter(Boolean).forEach((repeatParam) => {
					expect(declared.has(repeatParam as string)).toBe(true);
				});
			});
		});
	});
});
