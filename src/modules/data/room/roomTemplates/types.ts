import { MessageSchema } from "@/locales/schema";
import { BoardLayout, ContentElementType, RoomColor, RoomFeatures } from "@api-server";

export type RoomTemplateParamValue = string | number;

export type RoomTemplateParamValues = Record<string, RoomTemplateParamValue>;

export interface RoomTemplateParam {
	/** name of the placeholder, e.g. `subject` fills `{subject}` in every text of the template */
	key: string;
	labelKey: keyof MessageSchema;
	type: "text" | "number";
	defaultValue: RoomTemplateParamValue;
	/** only for numbers, they also bound how often a repeated column or card is created */
	min?: number;
	max?: number;
}

export interface RoomTemplateElement {
	type: ContentElementType.RICH_TEXT;
	/** i18n key of the rich text content (may contain simple html) */
	textKey: keyof MessageSchema;
}

export interface RoomTemplateCard {
	titleKey: keyof MessageSchema;
	elements: RoomTemplateElement[];
	/** key of a number param: the card is created that often, `{index}` counts from 1 */
	repeatParam?: string;
}

export interface RoomTemplateColumn {
	titleKey: keyof MessageSchema;
	cards: RoomTemplateCard[];
	/** key of a number param: the column is created that often, `{index}` counts from 1 */
	repeatParam?: string;
}

export interface RoomTemplateBoard {
	titleKey: keyof MessageSchema;
	layout: BoardLayout;
	columns: RoomTemplateColumn[];
}

export interface RoomTemplate {
	id: string;
	icon: string;
	titleKey: keyof MessageSchema;
	descriptionKey: keyof MessageSchema;
	/** suggested room name, prefilled into the form and editable */
	roomNameKey?: keyof MessageSchema;
	color: RoomColor;
	features: RoomFeatures[];
	params: RoomTemplateParam[];
	boards: RoomTemplateBoard[];
}

/**
 * A template with all placeholders filled in and all repetitions expanded - the shape that is
 * actually created in the room. The ai mode produces the same shape without a template.
 */
export interface ResolvedElement {
	type: ContentElementType.RICH_TEXT;
	text: string;
}

export interface ResolvedCard {
	title: string;
	elements: ResolvedElement[];
}

export interface ResolvedColumn {
	title: string;
	cards: ResolvedCard[];
}

export interface ResolvedBoard {
	title: string;
	layout: BoardLayout;
	columns: ResolvedColumn[];
}
