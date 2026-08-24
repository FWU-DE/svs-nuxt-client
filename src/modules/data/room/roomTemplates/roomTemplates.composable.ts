import { RoomTemplate, RoomTemplateBoard, RoomTemplateCard } from "./types";
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
import { useI18n } from "vue-i18n";

const RICH_TEXT_INPUT_FORMAT = "richTextCk5";

/** api calls per board that are not columns, cards or elements: create board + publish it */
const STEPS_PER_BOARD = 2;

const countSteps = (boards: RoomTemplateBoard[]): number =>
	boards.reduce((boardSteps, board) => {
		const columnSteps = board.columns.reduce((columnCount, column) => {
			const cardSteps = column.cards.reduce((cardCount, card) => cardCount + 1 + card.elements.length, 0);
			return columnCount + 1 + cardSteps;
		}, 0);

		return boardSteps + STEPS_PER_BOARD + columnSteps;
	}, 0);

/**
 * Creates the content of a room template through the regular board api. Everything it creates is
 * ordinary room content: it can be renamed, moved and deleted like hand-made content.
 */
export const useRoomTemplate = () => {
	const { t } = useI18n();

	const boardApi = BoardApiFactory(undefined, "/v3", $axios);
	const columnApi = BoardColumnApiFactory(undefined, "/v3", $axios);
	const cardApi = BoardCardApiFactory(undefined, "/v3", $axios);
	const elementApi = BoardElementApiFactory(undefined, "/v3", $axios);

	const isApplying = ref(false);
	const totalSteps = ref(0);
	const completedSteps = ref(0);

	const progress = computed(() => {
		if (totalSteps.value === 0) return 0;
		return Math.round((completedSteps.value / totalSteps.value) * 100);
	});

	const step = async <T>(call: Promise<T>): Promise<T> => {
		const result = await call;
		completedSteps.value += 1;
		return result;
	};

	const createCard = async (columnId: string, card: RoomTemplateCard) => {
		const cardId = (await step(columnApi.columnControllerCreateCard(columnId, {}))).data.id;
		await cardApi.cardControllerUpdateCardTitle(cardId, { title: t(card.titleKey) });

		for (const element of card.elements) {
			const elementId = (await step(cardApi.cardControllerCreateElement(cardId, { type: element.type }))).data.id;
			await elementApi.elementControllerUpdateElement(elementId, {
				data: {
					type: element.type,
					content: { text: t(element.textKey), inputFormat: RICH_TEXT_INPUT_FORMAT },
				},
			});
		}
	};

	const createBoard = async (roomId: string, board: RoomTemplateBoard) => {
		const boardId = (
			await step(
				boardApi.boardControllerCreateBoard({
					title: t(board.titleKey),
					parentId: roomId,
					parentType: BoardParentType.ROOM,
					layout: board.layout,
				})
			)
		).data.id;

		// columns have to be created one after another, their order follows the order of creation
		const columnIds: string[] = [];
		for (const column of board.columns) {
			const columnId = (await step(boardApi.boardControllerCreateColumn(boardId))).data.id;
			columnIds.push(columnId);
			await columnApi.columnControllerUpdateColumnTitle(columnId, { title: t(column.titleKey) });
		}

		// the columns are independent of each other, only the cards within a column need their order
		await Promise.all(
			board.columns.map(async (column, index) => {
				for (const card of column.cards) {
					await createCard(columnIds[index], card);
				}
			})
		);

		// a new board is a draft: without this the members of the room would not see it at all
		await step(boardApi.boardControllerUpdateVisibility(boardId, { isVisible: true }));
	};

	/**
	 * Applies the template to an already created room.
	 * @returns whether all of the template content could be created
	 */
	const applyTemplate = async (roomId: string, template: RoomTemplate): Promise<boolean> => {
		if (template.boards.length === 0) return true;

		isApplying.value = true;
		completedSteps.value = 0;
		totalSteps.value = countSteps(template.boards);
		let isComplete = true;

		try {
			// boards are created one after another to keep the order of the template
			for (const board of template.boards) {
				try {
					await createBoard(roomId, board);
				} catch (error) {
					isComplete = false;
					logger.error(`Could not create board "${board.titleKey}" of room template "${template.id}"`, error);
				}
			}
		} finally {
			isApplying.value = false;
		}

		return isComplete;
	};

	return {
		applyTemplate,
		isApplying,
		progress,
	};
};
