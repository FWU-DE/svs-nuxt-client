import { ResolvedBoard, ResolvedElement } from "./types";
import { BoardLayout, Colors } from "@api-server";

type AiElement =
	| { kind: "text"; text: string }
	| { kind: "link"; title: string; url: string }
	| { kind: "boardLink"; title: string; boardIndex: number }
	| { kind: "folder"; title: string }
	| { kind: "drawing" }
	| { kind: "collaborative" }
	| { kind: "videoConference"; title: string };

/** one line of the ndjson answer of the ai endpoints for rooms and boards */
export type AiStructureItem =
	| { type: "roomName"; name: string }
	| { type: "board"; title: string; layout: "columns" | "list" }
	| { type: "column"; title: string }
	| { type: "card"; title: string; color?: Colors; elements?: AiElement[] }
	| { type: "error" };

/**
 * Adds a streamed item to the structure that is growing. Columns go to the last board, cards to
 * the last column; an item that has no place to go yet is dropped.
 */
export const appendStructureItem = (boards: ResolvedBoard[], item: AiStructureItem): void => {
	const currentBoard = boards[boards.length - 1];
	const currentColumn = currentBoard?.columns[currentBoard.columns.length - 1];

	if (item.type === "board") {
		boards.push({
			title: item.title,
			layout: item.layout === "list" ? BoardLayout.LIST : BoardLayout.COLUMNS,
			columns: [],
		});
	} else if (item.type === "column" && currentBoard) {
		currentBoard.columns.push({ title: item.title, cards: [] });
	} else if (item.type === "card" && currentColumn) {
		currentColumn.cards.push({
			title: item.title,
			color: item.color,
			elements: (item.elements ?? []) as ResolvedElement[],
		});
	}
};

/** reads a ndjson body line by line, a line may arrive split over several chunks */
export const readAiStructureStream = async (
	body: ReadableStream<Uint8Array>,
	onItem: (item: AiStructureItem) => void
): Promise<void> => {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let rest = "";

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;

		const lines = (rest + decoder.decode(value, { stream: true })).split("\n");
		rest = lines.pop() ?? "";

		for (const line of lines) {
			if (line.trim().length === 0) continue;
			onItem(JSON.parse(line) as AiStructureItem);
		}
	}

	if (rest.trim().length > 0) onItem(JSON.parse(rest) as AiStructureItem);
};
