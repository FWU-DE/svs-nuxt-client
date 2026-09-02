import { $axios } from "@/utils/api";
import {
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	Colors,
	ContentElementType,
	UpdateElementContentBodyParams,
} from "@api-server";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

export type BoardAiPreset = "differentiate" | "exercises" | "simplify" | "selfCheck" | "free";

export type BoardAiElement = { kind: "text"; text: string } | { kind: "link"; title: string; url: string };

export interface BoardAiCard {
	title: string;
	color?: Colors;
	elements: BoardAiElement[];
}

export type BoardAiSource = { kind: "card"; id: string } | { kind: "column"; id: string };

const RICH_TEXT_INPUT_FORMAT = "richTextCk5";

/**
 * Asks the server for cards that fit an existing card or column and grows the result while it
 * arrives. The board itself is only touched when the teacher accepts the suggestion.
 */
export const useBoardAiCards = () => {
	const cardApi = BoardCardApiFactory(undefined, "/v3", $axios);
	const columnApi = BoardColumnApiFactory(undefined, "/v3", $axios);
	const elementApi = BoardElementApiFactory(undefined, "/v3", $axios);

	const cards = ref<BoardAiCard[]>([]);
	const isGenerating = ref(false);
	const isInserting = ref(false);
	const hasFailed = ref(false);

	let controller: AbortController | undefined;

	const isEmpty = computed(() => cards.value.length === 0);

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

				const item = JSON.parse(line) as Partial<BoardAiCard> & { type?: string };
				if (item.type === "error") {
					hasFailed.value = true;
				} else if (item.title !== undefined) {
					cards.value.push({ title: item.title, color: item.color, elements: item.elements ?? [] });
				}
			}
		}
	};

	const generate = async (source: BoardAiSource, preset: BoardAiPreset, prompt = "") => {
		controller?.abort();
		controller = new AbortController();

		cards.value = [];
		hasFailed.value = false;
		isGenerating.value = true;

		const path = source.kind === "card" ? `cards/${source.id}` : `columns/${source.id}`;

		try {
			const response = await fetch(`${$axios.defaults.baseURL ?? ""}/v3/${path}/ai-cards`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ preset, prompt }),
				signal: controller.signal,
			});

			if (!response.ok || response.body === null) throw new Error(`ai cards request failed: ${response.status}`);

			await readStream(response.body);
		} catch (error) {
			if ((error as Error)?.name === "AbortError") return;

			hasFailed.value = true;
			logger.error("Could not generate cards for the board", error);
		} finally {
			isGenerating.value = false;
		}
	};

	/**
	 * Creates the accepted cards at the end of the column.
	 * @returns whether everything could be created
	 */
	const insert = async (columnId: string, accepted: BoardAiCard[]): Promise<boolean> => {
		isInserting.value = true;
		let isComplete = true;

		try {
			for (const card of accepted) {
				const cardId = (await columnApi.columnControllerCreateCard(columnId, {})).data.id;
				await cardApi.cardControllerUpdateCardTitle(cardId, { title: card.title });
				if (card.color) await cardApi.cardControllerUpdateCardColor(cardId, { backgroundColor: card.color });

				for (const element of card.elements) {
					await createElement(cardId, element);
				}
			}
		} catch (error) {
			isComplete = false;
			logger.error("Could not insert the suggested cards", error);
		} finally {
			isInserting.value = false;
		}

		return isComplete;
	};

	const createElement = async (cardId: string, element: BoardAiElement) => {
		const type = element.kind === "link" ? ContentElementType.LINK : ContentElementType.RICH_TEXT;
		const elementId = (await cardApi.cardControllerCreateElement(cardId, { type })).data.id;

		const content: UpdateElementContentBodyParams =
			element.kind === "link"
				? { data: { type: ContentElementType.LINK, content: { url: element.url, title: element.title } } }
				: {
						data: {
							type: ContentElementType.RICH_TEXT,
							content: { text: element.text, inputFormat: RICH_TEXT_INPUT_FORMAT },
						},
					};

		await elementApi.elementControllerUpdateElement(elementId, content);
	};

	const cancel = () => {
		controller?.abort();
		isGenerating.value = false;
	};

	const reset = () => {
		cancel();
		cards.value = [];
		hasFailed.value = false;
	};

	return {
		cancel,
		cards,
		generate,
		hasFailed,
		insert,
		isEmpty,
		isGenerating,
		isInserting,
		reset,
	};
};
