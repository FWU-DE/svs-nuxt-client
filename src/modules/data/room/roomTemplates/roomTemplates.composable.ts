import { ResolvedBoard, ResolvedCard } from "./types";
import { $axios } from "@/utils/api";
import {
	BoardApiFactory,
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	BoardParentType,
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

	const createCard = async (columnId: string, card: ResolvedCard, key: string) => {
		const cardId = (await step(columnApi.columnControllerCreateCard(columnId, {}))).data.id;
		await cardApi.cardControllerUpdateCardTitle(cardId, { title: card.title });

		for (const element of card.elements) {
			const elementId = (await step(cardApi.cardControllerCreateElement(cardId, { type: element.type }))).data.id;
			await elementApi.elementControllerUpdateElement(elementId, {
				data: {
					type: element.type,
					content: { text: element.text, inputFormat: RICH_TEXT_INPUT_FORMAT },
				},
			});
		}

		createdKeys.value = [...createdKeys.value, key];
	};

	const createBoard = async (roomId: string, board: ResolvedBoard, boardIndex: number) => {
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
		createdKeys.value = [...createdKeys.value, boardKey(boardIndex)];

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
					await createCard(columnIds[columnIndex], card, cardKey(boardIndex, columnIndex, cardIndex));
				}
			})
		);

		// a new board is a draft: without this the members of the room would not see it at all
		await step(boardApi.boardControllerUpdateVisibility(boardId, { isVisible: true }));
	};

	/**
	 * Creates the boards of a resolved template in an already created room.
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
			// boards are created one after another to keep the order of the template
			for (const [boardIndex, board] of boards.entries()) {
				try {
					await createBoard(roomId, board, boardIndex);
				} catch (error) {
					isComplete = false;
					logger.error(`Could not create board "${board.title}" of a room template`, error);
				}
			}
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
