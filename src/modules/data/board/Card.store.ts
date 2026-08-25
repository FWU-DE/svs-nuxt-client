import { CreateCardSuccessPayload } from "./boardActions/boardActionPayload.types";
import { useBoardFocusHandler } from "./BoardFocusHandler.composable";
import {
	CreateElementRequestPayload,
	CreateElementSuccessPayload,
	DeleteCardSuccessPayload,
	DeleteElementSuccessPayload,
	DuplicateCardSuccessPayload,
	FetchCardSuccessPayload,
	MoveElementSuccessPayload,
	UpdateCardColorSuccessPayload,
	UpdateCardHeightSuccessPayload,
	UpdateCardTitleSuccessPayload,
	CardCommentSuccessPayload,
	ReactToCardSuccessPayload,
	UpdateElementSuccessPayload,
	VoteInPollSuccessPayload,
} from "./cardActions/cardActionPayload.types";
import { useCardRestApi } from "./cardActions/cardRestApi.composable";
import { useCardSocketApi } from "./cardActions/cardSocketApi.composable";
import { useSharedEditMode } from "./edit-mode.composable";
import { FileRecordParent } from "@/types/file/File";
import {
	CardResponse,
	ContentElementType,
	CopyStatusEnum,
	PollElementResponse,
	PreferredToolResponse,
	ToolContextType,
} from "@api-server";
import { notifyError, notifyInfo } from "@data-app";
import { useEnvConfig } from "@data-env";
import { CollaboraFileType, useFileStorageApi } from "@data-file";
import { useSharedFileSelect, useSharedLastCreatedElement } from "@util-board";
import { useErrorHandler } from "@util-error-handling";
import { defineStore } from "pinia";
import { nextTick, Ref, ref } from "vue";

export const useCardStore = defineStore("cardStore", () => {
	const cards: Ref<Record<string, CardResponse>> = ref({});
	const preferredTools: Ref<PreferredToolResponse[]> = ref([]);
	const isPreferredToolsLoading: Ref<boolean> = ref(false);

	const { lastCreatedElementId } = useSharedLastCreatedElement();
	const { disableFileSelectOnMount, resetFileSelectOnMountEnabled } = useSharedFileSelect();

	const restApi = useCardRestApi();
	const isSocketEnabled = useEnvConfig().value.FEATURE_COLUMN_BOARD_SOCKET_ENABLED;

	const socketOrRest = isSocketEnabled ? useCardSocketApi() : restApi;

	const { setFocus, forceFocus } = useBoardFocusHandler();
	const { setEditModeId, editModeId } = useSharedEditMode();
	const { uploadCollaboraFile } = useFileStorageApi();
	const { generateErrorText } = useErrorHandler();

	const fetchCardRequest = socketOrRest.fetchCardRequest;

	const fetchCardSuccess = (payload: FetchCardSuccessPayload) => {
		for (const card of payload.cards) {
			cards.value[card.id] = card;
		}
	};

	const resetState = () => {
		cards.value = {};
	};

	const getCard = (cardId: string): CardResponse | undefined => cards.value[cardId];

	const createCardSuccess = (payload: CreateCardSuccessPayload) => {
		if (payload.newCard) {
			cards.value[payload.newCard.id] = payload.newCard;
		}
	};

	const updateCardTitleRequest = socketOrRest.updateCardTitleRequest;

	const updateCardTitleSuccess = (payload: UpdateCardTitleSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		card.title = payload.newTitle;
	};

	const updateCardColorRequest = socketOrRest.updateCardColorRequest;

	const updateCardColorSuccess = (payload: UpdateCardColorSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		card.backgroundColor = payload.backgroundColor;
	};

	const updateCardHeightRequest = socketOrRest.updateCardHeightRequest;

	const updateCardHeightSuccess = (payload: UpdateCardHeightSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		card.height = payload.newHeight;
	};

	const duplicateCard = socketOrRest.duplicateCardRequest;

	const hasRelevantContentForDuplicationWarning = (card: CardResponse): boolean =>
		card.elements.some((element) =>
			[
				ContentElementType.COLLABORATIVE_TEXT_EDITOR,
				ContentElementType.DRAWING,
				ContentElementType.EXTERNAL_TOOL,
			].includes(element.type)
		);

	const duplicateCardSuccess = (payload: DuplicateCardSuccessPayload) => {
		const { duplicatedCard } = payload;

		if (payload.isOwnAction === true) {
			if (payload.status !== CopyStatusEnum.SUCCESS) {
				notifyError(generateErrorText("notDuplicated", "boardCard"));
			}
			if (!duplicatedCard.id) {
				return;
			}

			cards.value[duplicatedCard.id] = duplicatedCard;
			if (hasRelevantContentForDuplicationWarning(duplicatedCard)) {
				notifyInfo("components.board.notifications.info.cardDuplicated");
			}
		}
	};

	const deleteCardRequest = socketOrRest.deleteCardRequest;

	const deleteCardSuccess = (payload: DeleteCardSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		if (payload.cardId === editModeId.value) {
			setEditModeId(undefined);
		}
		delete cards.value[payload.cardId];
	};

	const createElementRequest = socketOrRest.createElementRequest;

	const createFileElementWithCollabora = async (type: CollaboraFileType, fileName: string) => {
		if (!editModeId.value) {
			return;
		}

		disableFileSelectOnMount();
		const element = await createElementRequest({
			type: ContentElementType.FILE,
			cardId: editModeId.value,
		});
		if (!element) {
			resetFileSelectOnMountEnabled();
			return;
		}

		const uploadedCollaboraFile = await uploadCollaboraFile(type, element.id, FileRecordParent.BOARDNODES, fileName);
		if (!uploadedCollaboraFile) {
			await deleteElementRequest({ elementId: element.id, cardId: editModeId.value });
		}
		resetFileSelectOnMountEnabled();
	};

	const createPreferredElement = (payload: CreateElementRequestPayload, tool: PreferredToolResponse) => {
		restApi.createPreferredElement(payload, tool);
	};

	const createElementSuccess = (payload: CreateElementSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		const { toPosition } = payload;
		if (toPosition !== undefined && toPosition >= 0 && toPosition <= card.elements.length) {
			card.elements.splice(toPosition, 0, payload.newElement);
		} else {
			card.elements.push(payload.newElement);
		}

		if (payload.isOwnAction === true) {
			lastCreatedElementId.value = payload.newElement.id;
			setFocus(payload.newElement.id);
		}

		return payload.newElement;
	};

	const addTextAfterTitle = async (cardId: string) => {
		const card = cards.value[cardId];
		if (card === undefined) return;

		return await createElementRequest({
			type: ContentElementType.RICH_TEXT,
			cardId: card.id,
			toPosition: 0,
		});
	};

	const moveElementRequest = async (cardId: string, elementId: string, elementIndex: number, delta: 1 | -1) => {
		const card = cards.value[cardId];
		if (card === undefined) return;

		const toPosition = elementIndex + delta;
		if (toPosition < 0) return;
		if (toPosition >= card.elements.length) return;

		await socketOrRest.moveElementRequest({
			elementId,
			toCardId: cardId,
			toPosition,
		});
	};

	const moveElementSuccess = async (payload: MoveElementSuccessPayload) => {
		const card = cards.value[payload.toCardId];
		if (card === undefined) return;

		const element = card.elements.find((e) => e.id === payload.elementId);

		if (element) {
			card.elements.splice(card.elements.indexOf(element), 1);
			await nextTick();
			const toPosition = Math.min(payload.toPosition, card.elements.length);
			card.elements.splice(toPosition, 0, element);
		}
	};

	const deleteElementRequest = socketOrRest.deleteElementRequest;

	const deleteElementSuccess = (payload: DeleteElementSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		const { focusedId } = useBoardFocusHandler(payload.elementId);
		if (focusedId?.value === payload.elementId) {
			const previousId = getPreviousElementId(payload.elementId, payload.cardId);

			if (!previousId) return;
			forceFocus(previousId);
		}

		const index = card.elements.findIndex((e) => e.id === payload.elementId);
		if (index !== undefined && index > -1) {
			card.elements.splice(index, 1);
		}
		setEditModeId(payload.cardId);
	};

	const updateElementRequest = socketOrRest.updateElementRequest;

	const updateElementSuccess = (payload: UpdateElementSuccessPayload) => {
		const cardToUpdate = Object.values(cards.value).find((c) => c.elements.some((e) => e.id === payload.elementId));
		if (cardToUpdate === undefined) return;
		const cardId = cardToUpdate.id;

		if (cardId) {
			const elementIndex = cardToUpdate.elements.findIndex((e) => e.id === payload.elementId);
			const currentElement = cardToUpdate.elements[elementIndex];

			// A poll update carries only the poll's definition. Assigning it wholesale would drop
			// the tally and this reader's own ballot, which no update ever changes.
			cards.value[cardId].elements[elementIndex].content =
				payload.data.type === ContentElementType.POLL
					? { ...currentElement.content, ...payload.data.content }
					: payload.data.content;
		}
	};

	const reactToCardRequest = socketOrRest.reactToCardRequest;

	/**
	 * The room broadcast reports the new totals with no `ownValue`, because a reaction is not
	 * public. Only the reacting client's own answer may set it.
	 */
	const reactToCardSuccess = (payload: ReactToCardSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		const incoming = payload.card.reactions;
		if (incoming === undefined) {
			card.reactions = undefined;
			return;
		}

		card.reactions = payload.isOwnAction ? incoming : { ...incoming, ownValue: card.reactions?.ownValue };
	};

	const addCardCommentRequest = socketOrRest.addCardCommentRequest;
	const editCardCommentRequest = socketOrRest.editCardCommentRequest;
	const removeCardCommentRequest = socketOrRest.removeCardCommentRequest;
	const reportCardCommentRequest = socketOrRest.reportCardCommentRequest;

	/**
	 * The room broadcast carries no comment: how a comment reads depends on who is looking
	 * (own, reported by me, how often reported), so everyone else refetches the card instead of
	 * being handed the acting user's view of it.
	 */
	const cardCommentSuccess = (payload: CardCommentSuccessPayload) => {
		const card = cards.value[payload.cardId];
		if (card === undefined) return;

		if (!payload.isOwnAction || payload.comment === undefined) {
			fetchCardRequest({ cardIds: [payload.cardId] });
			return;
		}

		const comments = card.comments ?? [];
		const index = comments.findIndex((comment) => comment.id === payload.comment?.id);

		card.comments = index === -1 ? [...comments, payload.comment] : comments.with(index, payload.comment);
	};

	const voteInPollRequest = socketOrRest.voteInPollRequest;

	/**
	 * The board room only ever learns the new tally, never who voted. That payload therefore
	 * carries an empty `ownVote`, which must not overwrite the ballot this client cast — only
	 * the voter's own response is allowed to set it.
	 */
	const voteInPollSuccess = (payload: VoteInPollSuccessPayload) => {
		const cardToUpdate = Object.values(cards.value).find((c) => c.elements.some((e) => e.id === payload.elementId));
		if (cardToUpdate === undefined) return;

		const elementIndex = cardToUpdate.elements.findIndex((e) => e.id === payload.elementId);
		const currentElement = cardToUpdate.elements[elementIndex] as PollElementResponse | undefined;
		const ownVote =
			currentElement?.type === ContentElementType.POLL ? currentElement.content.ownVote : [];

		cards.value[cardToUpdate.id].elements[elementIndex] = {
			...payload.pollElement,
			content: {
				...payload.pollElement.content,
				ownVote: payload.isOwnAction ? payload.pollElement.content.ownVote : ownVote,
			},
		};
	};

	const getPreviousElementId = (elementId: string, cardId: string): string | undefined => {
		const elements = cards.value[cardId].elements;
		if (elements.length === 0) return cardId;

		const elementIndex = elements.findIndex((e) => e.id === elementId);
		if (elementIndex <= 0) return cardId;

		const previousElement = elements[elementIndex - 1];

		if (previousElement.type === ContentElementType.RICH_TEXT) {
			return getPreviousElementId(previousElement.id, cardId);
		}

		return previousElement.id;
	};

	const loadPreferredTools = async (contextType: ToolContextType) => {
		isPreferredToolsLoading.value = true;

		preferredTools.value = (await restApi.getPreferredTools(contextType)) || [];

		isPreferredToolsLoading.value = false;
	};

	const disconnectSocketRequest = () => {
		socketOrRest.disconnectSocketRequest();
	};

	return {
		createPreferredElement,
		createCardSuccess,
		createElementRequest,
		createElementSuccess,
		deleteElementRequest,
		deleteElementSuccess,
		updateElementRequest,
		updateElementSuccess,
		voteInPollRequest,
		voteInPollSuccess,
		reactToCardRequest,
		reactToCardSuccess,
		addCardCommentRequest,
		editCardCommentRequest,
		removeCardCommentRequest,
		reportCardCommentRequest,
		cardCommentSuccess,
		addTextAfterTitle,
		fetchCardRequest,
		fetchCardSuccess,
		cards,
		duplicateCard,
		duplicateCardSuccess,
		deleteCardRequest,
		deleteCardSuccess,
		getCard,
		moveElementRequest,
		moveElementSuccess,
		resetState,
		updateCardHeightRequest,
		updateCardHeightSuccess,
		updateCardTitleRequest,
		updateCardTitleSuccess,
		updateCardColorRequest,
		updateCardColorSuccess,
		loadPreferredTools,
		preferredTools,
		isPreferredToolsLoading,
		disconnectSocketRequest,
		createFileElementWithCollabora,
	};
});
