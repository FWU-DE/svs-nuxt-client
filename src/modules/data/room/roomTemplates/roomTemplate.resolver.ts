import {
	ResolvedBoard,
	ResolvedCard,
	ResolvedColumn,
	ResolvedElement,
	RoomTemplate,
	RoomTemplateCard,
	RoomTemplateColumn,
	RoomTemplateElement,
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

const resolveElement = (
	element: RoomTemplateElement,
	values: RoomTemplateParamValues,
	translate: TemplateTranslator
): ResolvedElement => {
	switch (element.kind) {
		case "text":
			return { kind: "text", text: translate(element.textKey, values) };
		case "link":
			return { kind: "link", title: translate(element.titleKey, values), url: element.url };
		case "boardLink":
			return { kind: "boardLink", title: translate(element.titleKey, values), boardIndex: element.boardIndex };
		case "folder":
			return { kind: "folder", title: translate(element.titleKey, values) };
		case "videoConference":
			return { kind: "videoConference", title: translate(element.titleKey, values) };
		default:
			return element;
	}
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
				color: card.color,
				elements: card.elements.map((element) => resolveElement(element, cardValues, translate)),
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
