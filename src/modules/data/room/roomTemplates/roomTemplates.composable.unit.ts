import { getRoomTemplateById, roomTemplates } from "./roomTemplates";
import { useRoomTemplate } from "./roomTemplates.composable";
import { RoomTemplate } from "./types";
import { i18nMock, mockApi, mockApiResponse, mountComposable } from "@@/tests/test-utils";
import { createTestingI18n } from "@@/tests/test-utils/setup";
import {
	BoardApiFactory,
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	BoardLayout,
	BoardParentType,
	CardResponse,
	ColumnResponse,
	ContentElementType,
	CreateBoardResponse,
	RichTextElementResponse,
	RoomColor,
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

	const setup = () =>
		mountComposable(() => useRoomTemplate(), {
			global: {
				plugins: [createTestingI18n()],
				mocks: i18nMock,
			},
		});

	const singleBoardTemplate: RoomTemplate = {
		id: "test-template",
		icon: "icon",
		titleKey: "pages.roomCreate.templates.subject.title",
		descriptionKey: "pages.roomCreate.templates.subject.description",
		color: RoomColor.BLUE,
		features: [],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.subject.boards.overview",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.subject.columns.material",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.links.title",
								elements: [
									{
										type: ContentElementType.RICH_TEXT,
										textKey: "pages.roomCreate.templates.subject.cards.material.text",
									},
								],
							},
						],
					},
				],
			},
		],
	};

	describe("when the template has no content", () => {
		it("should not call the board api", async () => {
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", getRoomTemplateById("blank") as RoomTemplate);

			expect(isComplete).toBe(true);
			expect(boardApiMock.boardControllerCreateBoard).not.toHaveBeenCalled();
		});
	});

	describe("when a template is applied", () => {
		it("should create the board in the room", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoardTemplate);

			expect(boardApiMock.boardControllerCreateBoard).toHaveBeenCalledWith({
				title: "pages.roomCreate.templates.subject.boards.overview",
				parentId: "room-id",
				parentType: BoardParentType.ROOM,
				layout: BoardLayout.COLUMNS,
			});
		});

		it("should create the columns and cards with their titles", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoardTemplate);

			expect(boardApiMock.boardControllerCreateColumn).toHaveBeenCalledWith("board-1");
			expect(columnApiMock.columnControllerUpdateColumnTitle).toHaveBeenCalledWith("column-1", {
				title: "pages.roomCreate.templates.subject.columns.material",
			});
			expect(columnApiMock.columnControllerCreateCard).toHaveBeenCalledWith("column-1", {});
			expect(cardApiMock.cardControllerUpdateCardTitle).toHaveBeenCalledWith("card-1", {
				title: "pages.roomCreate.templates.subject.cards.links.title",
			});
		});

		it("should fill the elements with the content of the template", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoardTemplate);

			expect(cardApiMock.cardControllerCreateElement).toHaveBeenCalledWith("card-1", {
				type: ContentElementType.RICH_TEXT,
			});
			expect(elementApiMock.elementControllerUpdateElement).toHaveBeenCalledWith("element-1", {
				data: {
					type: ContentElementType.RICH_TEXT,
					content: {
						text: "pages.roomCreate.templates.subject.cards.material.text",
						inputFormat: "richTextCk5",
					},
				},
			});
		});

		it("should publish the board, so that members of the room can see it", async () => {
			const composable = setup();

			await composable.applyTemplate("room-id", singleBoardTemplate);

			expect(boardApiMock.boardControllerUpdateVisibility).toHaveBeenCalledWith("board-1", { isVisible: true });
		});

		it("should report a complete run", async () => {
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", singleBoardTemplate);

			expect(isComplete).toBe(true);
			expect(composable.progress.value).toBe(100);
			expect(composable.isApplying.value).toBe(false);
		});
	});

	describe("when a board of the template cannot be created", () => {
		it("should report an incomplete run instead of throwing", async () => {
			vi.spyOn(logger, "error").mockImplementation(vi.fn());
			boardApiMock.boardControllerCreateBoard.mockRejectedValue(new Error("Network error"));
			const composable = setup();

			const isComplete = await composable.applyTemplate("room-id", singleBoardTemplate);

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
	});
});
