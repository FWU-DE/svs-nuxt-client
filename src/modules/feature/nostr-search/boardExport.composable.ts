import { NostrSearchResult } from "./types";
import { $axios } from "@/utils/api";
import {
	BoardApiFactory,
	BoardCardApiFactory,
	BoardColumnApiFactory,
	BoardElementApiFactory,
	ContentElementType,
	CreateCardBodyParamsRequiredEmptyElements,
	RichTextType,
	RoomApiFactory,
	RoomBoardItemResponse,
	RoomItemResponse,
} from "@api-server";
import { ref } from "vue";

/**
 * Puts a search hit onto a board.
 *
 * A board card is assembled from the same pieces the board UI uses, in the order the API needs
 * them: create the card in a column, name it, fill the empty rich text element the card is born
 * with, and — when the hit has a web address — add a link element so the card shows the resource
 * as a proper link rather than a URL buried in a paragraph.
 *
 * Boards are only offered where the user may actually create a card; the room list and the
 * board's own `allowedOperations` decide that, so we never present a target the API will refuse.
 */

export interface NostrCardLabels {
	source: string;
	license: string;
	via: string;
}

const escapeHtml = (value: string): string =>
	value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const paragraph = (html: string): string => `<p>${html}</p>`;

const link = (url: string, text: string): string =>
	`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;

/** The card body. Everything that reaches it is escaped — relay content is never trusted markup. */
export const buildCardHtml = (result: NostrSearchResult, labels: NostrCardLabels): string => {
	const blocks: string[] = [];

	if (result.content.trim().length > 0) {
		blocks.push(paragraph(escapeHtml(result.content.trim()).replace(/\n+/g, "<br />")));
	}

	const resource = result.resource;
	const credits = [...(resource?.creators ?? []), resource?.publisher].filter(Boolean).join(" · ");
	if (credits.length > 0) blocks.push(paragraph(escapeHtml(credits)));

	if (resource?.licenseUrl) {
		blocks.push(
			paragraph(
				`${escapeHtml(labels.license)}: ${link(resource.licenseUrl, resource.licenseLabel ?? resource.licenseUrl)}`
			)
		);
	}

	if (result.externalUrl) {
		blocks.push(paragraph(`${escapeHtml(labels.source)}: ${link(result.externalUrl, result.externalUrl)}`));
	}

	blocks.push(paragraph(escapeHtml(labels.via)));

	return blocks.join("");
};

const MAX_TITLE_LENGTH = 100;

export const buildCardTitle = (result: NostrSearchResult, fallback: string): string => {
	const name = result.title ?? result.author.profile?.displayName ?? result.author.profile?.name ?? fallback;

	return name.length > MAX_TITLE_LENGTH ? `${name.slice(0, MAX_TITLE_LENGTH - 1)}…` : name;
};

export const useNostrBoardExport = () => {
	const boardApi = BoardApiFactory(undefined, "/v3", $axios);
	const columnApi = BoardColumnApiFactory(undefined, "/v3", $axios);
	const cardApi = BoardCardApiFactory(undefined, "/v3", $axios);
	const elementApi = BoardElementApiFactory(undefined, "/v3", $axios);
	const roomApi = RoomApiFactory(undefined, "/v3", $axios);

	const rooms = ref<RoomItemResponse[]>([]);
	const boards = ref<RoomBoardItemResponse[]>([]);
	const isLoading = ref(false);
	const isSubmitting = ref(false);
	const errorKey = ref<string | undefined>(undefined);

	const loadRooms = async (): Promise<void> => {
		isLoading.value = true;
		errorKey.value = undefined;
		try {
			const response = await roomApi.roomControllerGetRooms();
			rooms.value = response.data.data;
		} catch {
			errorKey.value = "pages.nostrSearch.board.error.rooms";
		} finally {
			isLoading.value = false;
		}
	};

	const loadBoards = async (roomId: string): Promise<void> => {
		isLoading.value = true;
		errorKey.value = undefined;
		boards.value = [];
		try {
			const response = await roomApi.roomControllerGetRoomBoards(roomId);
			// A board the user may only read is not a target — leaving it out beats a 403 later.
			boards.value = response.data.data.filter((board) => board.allowedOperations.relocateContent !== false);
		} catch {
			errorKey.value = "pages.nostrSearch.board.error.boards";
		} finally {
			isLoading.value = false;
		}
	};

	const addToBoard = async (
		result: NostrSearchResult,
		boardId: string,
		labels: NostrCardLabels & { fallbackTitle: string }
	): Promise<boolean> => {
		isSubmitting.value = true;
		errorKey.value = undefined;

		try {
			const board = (await boardApi.boardControllerGetBoardSkeleton(boardId)).data;
			// An empty board has nowhere to put a card yet.
			const columnId = board.columns[0]?.id ?? (await boardApi.boardControllerCreateColumn(boardId)).data.id;

			const card = (
				await columnApi.columnControllerCreateCard(columnId, {
					requiredEmptyElements: [CreateCardBodyParamsRequiredEmptyElements.RICH_TEXT],
				})
			).data;

			await cardApi.cardControllerUpdateCardTitle(card.id, {
				title: buildCardTitle(result, labels.fallbackTitle),
			});

			const richTextElement = card.elements.find((element) => element.type === ContentElementType.RICH_TEXT);
			if (richTextElement) {
				await elementApi.elementControllerUpdateElement(richTextElement.id, {
					data: {
						type: ContentElementType.RICH_TEXT,
						content: { text: buildCardHtml(result, labels), inputFormat: RichTextType.RICH_TEXT_CK5 },
					},
				});
			}

			if (result.externalUrl) {
				const linkElement = (await cardApi.cardControllerCreateElement(card.id, { type: ContentElementType.LINK }))
					.data;

				await elementApi.elementControllerUpdateElement(linkElement.id, {
					data: {
						type: ContentElementType.LINK,
						content: {
							url: result.externalUrl,
							title: buildCardTitle(result, labels.fallbackTitle),
							description: result.content.slice(0, 300),
							imageUrl: result.resource?.imageUrl ?? "",
							originalImageUrl: result.resource?.imageUrl ?? "",
						},
					},
				});
			}

			return true;
		} catch {
			errorKey.value = "pages.nostrSearch.board.error.add";

			return false;
		} finally {
			isSubmitting.value = false;
		}
	};

	return { rooms, boards, isLoading, isSubmitting, errorKey, loadRooms, loadBoards, addToBoard };
};
