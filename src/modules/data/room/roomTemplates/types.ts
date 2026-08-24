import { MessageSchema } from "@/locales/schema";
import { BoardLayout, Colors, RoomColor, RoomFeatures } from "@api-server";

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

/**
 * The content a card can carry. `boardLink` is not a content element of its own: it becomes a link
 * element as soon as the board it points at exists, which is how a room cross-references itself.
 */
export type RoomTemplateElement =
	| { kind: "text"; textKey: keyof MessageSchema }
	| { kind: "link"; titleKey: keyof MessageSchema; url: string }
	| { kind: "boardLink"; titleKey: keyof MessageSchema; boardIndex: number }
	| { kind: "folder"; titleKey: keyof MessageSchema }
	| { kind: "drawing" }
	| { kind: "collaborative" }
	| { kind: "videoConference"; titleKey: keyof MessageSchema };

export interface RoomTemplateCard {
	titleKey: keyof MessageSchema;
	elements: RoomTemplateElement[];
	color?: Colors;
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
export type ResolvedElement =
	| { kind: "text"; text: string }
	| { kind: "link"; title: string; url: string }
	| { kind: "boardLink"; title: string; boardIndex: number }
	| { kind: "folder"; title: string }
	| { kind: "drawing" }
	| { kind: "collaborative" }
	| { kind: "videoConference"; title: string };

export interface ResolvedCard {
	title: string;
	elements: ResolvedElement[];
	color?: Colors;
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
