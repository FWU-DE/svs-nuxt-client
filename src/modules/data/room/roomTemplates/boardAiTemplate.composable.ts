import { AiStructureItem, appendStructureItem, readAiStructureStream } from "./aiStructureStream";
import { ResolvedBoard } from "./types";
import { HttpStatusCode } from "@/types/enum/http-status-code.enum";
import { $axios } from "@/utils/api";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

export interface BoardAiTemplateOptions {
	/** upper bound for the number of columns the ai may suggest, the server takes 1 to 12 */
	maxColumns?: number;
}

/**
 * Asks the server for the structure of a single board in an existing room and grows it while it
 * arrives. The result is created by the same builder as the boards of a room template.
 */
export const useBoardAiTemplate = () => {
	const boards = ref<ResolvedBoard[]>([]);
	const isGenerating = ref(false);
	const hasFailed = ref(false);
	/** the shared daily budget for AI suggestions is used up; trying again right away will not help */
	const isBudgetExceeded = ref(false);
	/** the feature is switched off or the user may not edit the room */
	const isForbidden = ref(false);

	let controller: AbortController | undefined;

	/** the server sends exactly one board; anything after it would be ignored by it anyway */
	const board = computed<ResolvedBoard | undefined>(() => boards.value[0]);
	const isEmpty = computed(() => board.value === undefined);

	const appendItem = (item: AiStructureItem) => {
		if (item.type === "error") {
			hasFailed.value = true;
		} else if (item.type === "board" && boards.value.length > 0) {
			// a second board has no place in this dialog
			return;
		} else {
			appendStructureItem(boards.value, item);
		}
	};

	const clear = () => {
		boards.value = [];
		hasFailed.value = false;
		isBudgetExceeded.value = false;
		isForbidden.value = false;
	};

	const generate = async (roomId: string, prompt: string, options: BoardAiTemplateOptions = {}) => {
		controller?.abort();
		const current = new AbortController();
		controller = current;

		clear();
		isGenerating.value = true;

		const body: { prompt: string; maxColumns?: number } = { prompt };
		if (options.maxColumns !== undefined) body.maxColumns = options.maxColumns;

		try {
			const response = await fetch(`${$axios.defaults.baseURL ?? ""}/v3/rooms/${encodeURIComponent(roomId)}/ai-board`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal: current.signal,
			});

			if (response.status === HttpStatusCode.TooManyRequests) isBudgetExceeded.value = true;
			if (response.status === HttpStatusCode.Forbidden) isForbidden.value = true;
			if (!response.ok || response.body === null) throw new Error(`ai board request failed: ${response.status}`);

			await readAiStructureStream(response.body, appendItem);
		} catch (error) {
			if ((error as Error)?.name === "AbortError") return;

			hasFailed.value = true;
			logger.error("Could not generate a board structure", error);
		} finally {
			// a request that was replaced by a newer one must not end the loading state of the newer one
			if (controller === current) isGenerating.value = false;
		}
	};

	const cancel = () => {
		controller?.abort();
		isGenerating.value = false;
	};

	const reset = () => {
		cancel();
		clear();
	};

	return {
		board,
		cancel,
		generate,
		hasFailed,
		isBudgetExceeded,
		isEmpty,
		isForbidden,
		isGenerating,
		reset,
	};
};
