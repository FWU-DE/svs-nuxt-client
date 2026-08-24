import {
	ResolvedBoard,
	ResolvedCard,
	ResolvedColumn,
	RoomTemplate,
	RoomTemplateCard,
	RoomTemplateColumn,
	RoomTemplateParamValues,
} from "./types";
import { MessageSchema } from "@/locales/schema";

export type TemplateTranslator = (key: keyof MessageSchema, values: RoomTemplateParamValues) => string;

export const defaultParamValues = (template: RoomTemplate): RoomTemplateParamValues =>
	Object.fromEntries(template.params.map((param) => [param.key, param.defaultValue]));

const repetitionsOf = (repeatParam: string | undefined, values: RoomTemplateParamValues): number => {
	if (repeatParam === undefined) return 1;

	const count = Number(values[repeatParam]);
	return Number.isFinite(count) ? Math.max(Math.trunc(count), 0) : 0;
};

const resolveCards = (
	cards: RoomTemplateCard[],
	values: RoomTemplateParamValues,
	translate: TemplateTranslator
): ResolvedCard[] =>
	cards.flatMap((card) =>
		Array.from({ length: repetitionsOf(card.repeatParam, values) }, (_unused, position) => {
			// only a repeated card counts its own index, an ordinary card keeps the one of its column
			const cardValues = card.repeatParam === undefined ? values : { ...values, index: position + 1 };

			return {
				title: translate(card.titleKey, cardValues),
				elements: card.elements.map((element) => ({
					type: element.type,
					text: translate(element.textKey, cardValues),
				})),
			};
		})
	);

const resolveColumns = (
	columns: RoomTemplateColumn[],
	values: RoomTemplateParamValues,
	translate: TemplateTranslator
): ResolvedColumn[] =>
	columns.flatMap((column) =>
		Array.from({ length: repetitionsOf(column.repeatParam, values) }, (_unused, position) => {
			const columnValues = column.repeatParam === undefined ? values : { ...values, index: position + 1 };

			return {
				title: translate(column.titleKey, columnValues),
				cards: resolveCards(column.cards, columnValues, translate),
			};
		})
	);

/**
 * Fills the placeholders of a template with the given parameter values and expands every column
 * and card that repeats over a number parameter.
 */
export const resolveTemplate = (
	template: RoomTemplate,
	values: RoomTemplateParamValues,
	translate: TemplateTranslator
): ResolvedBoard[] =>
	template.boards.map((board) => ({
		title: translate(board.titleKey, values),
		layout: board.layout,
		columns: resolveColumns(board.columns, values, translate),
	}));

export const resolveRoomName = (
	template: RoomTemplate,
	values: RoomTemplateParamValues,
	translate: TemplateTranslator
): string => (template.roomNameKey ? translate(template.roomNameKey, values).trim() : "");
