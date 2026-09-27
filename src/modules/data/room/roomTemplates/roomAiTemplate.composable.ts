import { AiStructureItem, appendStructureItem, readAiStructureStream } from "./aiStructureStream";
import { ResolvedBoard } from "./types";
import { HttpStatusCode } from "@/types/enum/http-status-code.enum";
import { $axios } from "@/utils/api";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

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
	/** the shared daily budget for AI suggestions is used up; trying again right away will not help */
	const isBudgetExceeded = ref(false);

	let controller: AbortController | undefined;

	const isEmpty = computed(() => boards.value.length === 0);

	const hasVideoConference = computed(() =>
		boards.value.some((board) =>
			board.columns.some((column) =>
				column.cards.some((card) => card.elements.some((element) => element.kind === "videoConference"))
			)
		)
	);

	const appendItem = (item: AiStructureItem) => {
		if (item.type === "roomName") {
			roomName.value = item.name;
		} else if (item.type === "error") {
			hasFailed.value = true;
		} else {
			appendStructureItem(boards.value, item);
		}
	};

	const generate = async (prompt: string) => {
		controller?.abort();
		controller = new AbortController();

		boards.value = [];
		roomName.value = "";
		hasFailed.value = false;
		isBudgetExceeded.value = false;
		isGenerating.value = true;

		try {
			const response = await fetch(`${$axios.defaults.baseURL ?? ""}/v3/rooms/ai-template`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
				signal: controller.signal,
			});

			if (response.status === HttpStatusCode.TooManyRequests) isBudgetExceeded.value = true;
			if (!response.ok || response.body === null) throw new Error(`ai template request failed: ${response.status}`);

			await readAiStructureStream(response.body, appendItem);
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
		isBudgetExceeded.value = false;
	};

	return {
		boards,
		cancel,
		generate,
		hasFailed,
		hasVideoConference,
		isBudgetExceeded,
		isEmpty,
		isGenerating,
		reset,
		roomName,
	};
};
