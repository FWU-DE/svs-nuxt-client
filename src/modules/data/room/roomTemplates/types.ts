import { MessageSchema } from "@/locales/schema";
import { BoardLayout, ContentElementType, RoomColor, RoomFeatures } from "@api-server";

export interface RoomTemplateElement {
	type: ContentElementType.RICH_TEXT;
	/** i18n key of the rich text content (may contain simple html) */
	textKey: keyof MessageSchema;
}

export interface RoomTemplateCard {
	titleKey: keyof MessageSchema;
	elements: RoomTemplateElement[];
}

export interface RoomTemplateColumn {
	titleKey: keyof MessageSchema;
	cards: RoomTemplateCard[];
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
	boards: RoomTemplateBoard[];
}
