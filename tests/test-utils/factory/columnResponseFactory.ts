import { timestampsResponseFactory } from "./timestampsResponseFactory";
import { ColumnFullResponse, ColumnResponse } from "@api-server";
import { Factory } from "fishery";

export const columnResponseFactory = Factory.define<ColumnResponse>(({ sequence }) => ({
	id: `column${sequence}`,
	title: `column #${sequence}`,
	cards: [],
	timestamps: timestampsResponseFactory.build(),
	commentsEnabled: null,
	reactionType: null,
}));

export const columnFullResponseFactory = Factory.define<ColumnFullResponse>(({ sequence }) => ({
	id: `column${sequence}`,
	title: `column #${sequence}`,
	cards: [],
	timestamps: timestampsResponseFactory.build(),
	commentsEnabled: null,
	reactionType: null,
}));
