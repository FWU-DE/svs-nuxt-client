import { ResolvedBoard, ResolvedCard, ResolvedElement } from "./types";
import { $axios } from "@/utils/api";
import {
	BoardApiFactory,
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	BoardParentType,
	ContentElementType,
	UpdateElementContentBodyParams,
} from "@api-server";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

const RICH_TEXT_INPUT_FORMAT = "richTextCk5";

/** api calls per board that are not columns, cards or elements: create board + publish it */
const STEPS_PER_BOARD = 2;

/** identifies an item of the structure, so that a preview can show what has been created already */
export const boardKey = (boardIndex: number): string => `b${boardIndex}`;
export const columnKey = (boardIndex: number, columnIndex: number): string => `b${boardIndex}c${columnIndex}`;
export const cardKey = (boardIndex: number, columnIndex: number, cardIndex: number): string =>
	`b${boardIndex}c${columnIndex}k${cardIndex}`;

const ELEMENT_TYPES: Record<ResolvedElement["kind"], ContentElementType> = {
	text: ContentElementType.RICH_TEXT,
	link: ContentElementType.LINK,
	boardLink: ContentElementType.LINK,
	folder: ContentElementType.FILE_FOLDER,
	drawing: ContentElementType.DRAWING,
	collaborative: ContentElementType.COLLABORATIVE_TEXT_EDITOR,
	videoConference: ContentElementType.VIDEO_CONFERENCE,
};

const countSteps = (boards: ResolvedBoard[]): number =>
	boards.reduce((boardSteps, board) => {
		const columnSteps = board.columns.reduce((columnCount, column) => {
			const cardSteps = column.cards.reduce((cardCount, card) => cardCount + 1 + card.elements.length, 0);
			return columnCount + 1 + cardSteps;
		}, 0);

		return boardSteps + STEPS_PER_BOARD + columnSteps;
	}, 0);

/**
 * Creates the content of a resolved room template through the regular board api. Everything it
 * creates is ordinary room content: it can be renamed, moved and deleted like hand-made content.
 */
export const useRoomTemplate = () => {
	const boardApi = BoardApiFactory(undefined, "/v3", $axios);
	const columnApi = BoardColumnApiFactory(undefined, "/v3", $axios);
	const cardApi = BoardCardApiFactory(undefined, "/v3", $axios);
	const elementApi = BoardElementApiFactory(undefined, "/v3", $axios);

	const isApplying = ref(false);
	const totalSteps = ref(0);
	const completedSteps = ref(0);
	/** keys of the items that exist in the room already - drives the live preview */
	const createdKeys = ref<string[]>([]);

	const progress = computed(() => {
		if (totalSteps.value === 0) return 0;
		return Math.round((completedSteps.value / totalSteps.value) * 100);
	});

	const step = async <T>(call: Promise<T>): Promise<T> => {
		const result = await call;
		completedSteps.value += 1;
		return result;
	};

	const boardUrl = (boardId: string) => `${window.location.origin}/boards/${boardId}`;

	/**
	 * @returns the content of the element, or undefined for elements that are created empty
	 */
	const contentOf = (element: ResolvedElement, boardIds: string[]): UpdateElementContentBodyParams | undefined => {
		switch (element.kind) {
			case "text":
				return {
					data: {
						type: ContentElementType.RICH_TEXT,
						content: { text: element.text, inputFormat: RICH_TEXT_INPUT_FORMAT },
					},
				};
			case "link":
				return { data: { type: ContentElementType.LINK, content: { url: element.url, title: element.title } } };
			case "boardLink": {
				const boardId = boardIds[element.boardIndex];
				if (boardId === undefined) return undefined;

				return {
					data: { type: ContentElementType.LINK, content: { url: boardUrl(boardId), title: element.title } },
				};
			}
			case "folder":
				return { data: { type: ContentElementType.FILE_FOLDER, content: { title: element.title } } };
			case "videoConference":
				return { data: { type: ContentElementType.VIDEO_CONFERENCE, content: { title: element.title } } };
			default:
				// a drawing and a collaborative text document start out empty
				return undefined;
		}
	};

	const createElement = async (cardId: string, element: ResolvedElement, boardIds: string[]) => {
		// a reference to a board that was not created cannot be filled with anything meaningful
		const content = contentOf(element, boardIds);
		if (element.kind === "boardLink" && content === undefined) return;

		const elementId = (await step(cardApi.cardControllerCreateElement(cardId, { type: ELEMENT_TYPES[element.kind] })))
			.data.id;

		if (content === undefined) return;

		await elementApi.elementControllerUpdateElement(elementId, content);
	};

	const createCard = async (columnId: string, card: ResolvedCard, key: string, boardIds: string[]) => {
		const cardId = (await step(columnApi.columnControllerCreateCard(columnId, {}))).data.id;
		await cardApi.cardControllerUpdateCardTitle(cardId, { title: card.title });
		if (card.color) await cardApi.cardControllerUpdateCardColor(cardId, { backgroundColor: card.color });

		for (const element of card.elements) {
			try {
				await createElement(cardId, element, boardIds);
			} catch (error) {
				// a content type the instance does not offer must not cost us the rest of the card
				logger.error(`Could not create a ${element.kind} element of a room template`, error);
			}
		}

		createdKeys.value = [...createdKeys.value, key];
	};

	const fillBoard = async (boardId: string, board: ResolvedBoard, boardIndex: number, boardIds: string[]) => {
		// columns have to be created one after another, their order follows the order of creation
		const columnIds: string[] = [];
		for (const [columnIndex, column] of board.columns.entries()) {
			const columnId = (await step(boardApi.boardControllerCreateColumn(boardId))).data.id;
			columnIds.push(columnId);
			await columnApi.columnControllerUpdateColumnTitle(columnId, { title: column.title });
			createdKeys.value = [...createdKeys.value, columnKey(boardIndex, columnIndex)];
		}

		// the columns are independent of each other, only the cards within a column need their order
		await Promise.all(
			board.columns.map(async (column, columnIndex) => {
				for (const [cardIndex, card] of column.cards.entries()) {
					await createCard(columnIds[columnIndex], card, cardKey(boardIndex, columnIndex, cardIndex), boardIds);
				}
			})
		);
	};

	/**
	 * Creates the boards of a resolved template in an already created room. All boards are created
	 * before they are filled, so that cards can link to any board of the same room.
	 * @returns whether all of the content could be created
	 */
	const applyTemplate = async (roomId: string, boards: ResolvedBoard[]): Promise<boolean> => {
		if (boards.length === 0) return true;

		isApplying.value = true;
		completedSteps.value = 0;
		createdKeys.value = [];
		totalSteps.value = countSteps(boards);
		let isComplete = true;

		try {
			const boardIds: string[] = [];
			for (const [boardIndex, board] of boards.entries()) {
				const boardId = (
					await step(
						boardApi.boardControllerCreateBoard({
							title: board.title,
							parentId: roomId,
							parentType: BoardParentType.ROOM,
							layout: board.layout,
						})
					)
				).data.id;
				boardIds.push(boardId);
				createdKeys.value = [...createdKeys.value, boardKey(boardIndex)];
			}

			for (const [boardIndex, board] of boards.entries()) {
				try {
					await fillBoard(boardIds[boardIndex], board, boardIndex, boardIds);
					// a new board is a draft: without this the members of the room would not see it at all
					await step(boardApi.boardControllerUpdateVisibility(boardIds[boardIndex], { isVisible: true }));
				} catch (error) {
					isComplete = false;
					logger.error(`Could not fill board "${board.title}" of a room template`, error);
				}
			}
		} catch (error) {
			isComplete = false;
			logger.error("Could not create the boards of a room template", error);
		} finally {
			isApplying.value = false;
		}

		return isComplete;
	};

	return {
		applyTemplate,
		createdKeys,
		isApplying,
		progress,
	};
};
