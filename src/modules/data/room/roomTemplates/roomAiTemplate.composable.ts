import { ResolvedBoard } from "./types";
import { $axios } from "@/utils/api";
import { BoardLayout, ContentElementType } from "@api-server";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

type AiItem =
	| { type: "roomName"; name: string }
	| { type: "board"; title: string; layout: "columns" | "list" }
	| { type: "column"; title: string }
	| { type: "card"; title: string; text?: string }
	| { type: "error" };

/**
 * Asks the server for a room structure and grows the result while it arrives, so that the preview
 * can be watched being written. The result has the same shape as a resolved template and is
 * created by the very same apply composable.
 */
export const useRoomAiTemplate = () => {
	const boards = ref<ResolvedBoard[]>([]);
	const roomName = ref("");
	const isGenerating = ref(false);
	const hasFailed = ref(false);

	let controller: AbortController | undefined;

	const isEmpty = computed(() => boards.value.length === 0);

	const appendItem = (item: AiItem) => {
		const currentBoard = boards.value[boards.value.length - 1];
		const currentColumn = currentBoard?.columns[currentBoard.columns.length - 1];

		if (item.type === "roomName") {
			roomName.value = item.name;
		} else if (item.type === "board") {
			boards.value.push({
				title: item.title,
				layout: item.layout === "list" ? BoardLayout.LIST : BoardLayout.COLUMNS,
				columns: [],
			});
		} else if (item.type === "column" && currentBoard) {
			currentBoard.columns.push({ title: item.title, cards: [] });
		} else if (item.type === "card" && currentColumn) {
			currentColumn.cards.push({
				title: item.title,
				elements: item.text ? [{ type: ContentElementType.RICH_TEXT, text: item.text }] : [],
			});
		} else if (item.type === "error") {
			hasFailed.value = true;
		}
	};

	const readStream = async (body: ReadableStream<Uint8Array>) => {
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
				appendItem(JSON.parse(line) as AiItem);
			}
		}
	};

	const generate = async (prompt: string) => {
		controller?.abort();
		controller = new AbortController();

		boards.value = [];
		roomName.value = "";
		hasFailed.value = false;
		isGenerating.value = true;

		try {
			const response = await fetch(`${$axios.defaults.baseURL ?? ""}/v3/rooms/ai-template`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
				signal: controller.signal,
			});

			if (!response.ok || response.body === null) throw new Error(`ai template request failed: ${response.status}`);

			await readStream(response.body);
		} catch (error) {
			if ((error as Error)?.name === "AbortError") return;

			hasFailed.value = true;
			logger.error("Could not generate a room structure", error);
		} finally {
			isGenerating.value = false;
		}
	};

	const cancel = () => {
		controller?.abort();
		isGenerating.value = false;
	};

	const reset = () => {
		cancel();
		boards.value = [];
		roomName.value = "";
		hasFailed.value = false;
	};

	return {
		boards,
		cancel,
		generate,
		hasFailed,
		isEmpty,
		isGenerating,
		reset,
		roomName,
	};
};
