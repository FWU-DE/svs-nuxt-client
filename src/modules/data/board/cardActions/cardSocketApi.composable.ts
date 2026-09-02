import { useBoardAriaNotification } from "../ariaNotification/ariaLiveNotificationHandler";
import { useBoardStore } from "../Board.store";
import { useCardStore } from "../Card.store";
import { useSocketConnection } from "../socket/socket";
import {
	AddCardCommentRequestPayload,
	CreateElementRequestPayload,
	DeleteCardRequestPayload,
	DeleteElementRequestPayload,
	DuplicateCardRequestPayload,
	EditCardCommentRequestPayload,
	FetchCardRequestPayload,
	MoveElementRequestPayload,
	ReactToCardRequestPayload,
	RemoveCardCommentRequestPayload,
	ReportCardCommentRequestPayload,
	SetChecklistItemCheckedRequestPayload,
	UpdateCardColorRequestPayload,
	UpdateCardHeightRequestPayload,
	UpdateCardSettingsRequestPayload,
	UpdateCardTitleRequestPayload,
	UpdateElementRequestPayload,
	VoteInPollRequestPayload,
} from "./cardActionPayload.types";
import * as CardActions from "./cardActions";
import { handle, on, PermittedStoreActions } from "@/types/board/ActionFactory";
import { AnyContentElement } from "@/types/board/ContentElement";
import { AnyContentElementSchema } from "@/types/board/ContentElement.schema";
import { notifyError } from "@data-app";
import { useDebounceFn } from "@vueuse/core";
import { chunk } from "lodash-es";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";

export const useCardSocketApi = () => {
	const cardStore = useCardStore();
	const { t } = useI18n();

	const WAIT_AFTER_LAST_CALL_IN_MS = 30;
	const MAX_WAIT_BEFORE_FIRST_CALL_IN_MS = 200;
	let cardIdsToFetch: string[] = [];

	const {
		notifyUpdateCardTitleSuccess,
		notifyUpdateCardColorSuccess,
		notifyCreateElementSuccess,
		notifyDeleteElementSuccess,
		notifyDuplicateCardSuccess,
		notifyMoveElementSuccess,
		notifyUpdateElementSuccess,
	} = useBoardAriaNotification();

	const dispatch = async (action: PermittedStoreActions<typeof CardActions>) => {
		const successActions = [
			on(CardActions.createElementSuccess, cardStore.createElementSuccess),
			on(CardActions.deleteElementSuccess, cardStore.deleteElementSuccess),
			on(CardActions.moveElementSuccess, cardStore.moveElementSuccess),
			on(CardActions.updateElementSuccess, cardStore.updateElementSuccess),
			on(CardActions.voteInPollSuccess, cardStore.voteInPollSuccess),
			on(CardActions.setChecklistItemCheckedSuccess, cardStore.setChecklistItemCheckedSuccess),
			on(CardActions.reactToCardSuccess, cardStore.reactToCardSuccess),
			on(CardActions.updateCardSettingsSuccess, cardStore.updateCardSettingsSuccess),
			on(CardActions.addCardCommentSuccess, cardStore.cardCommentSuccess),
			on(CardActions.editCardCommentSuccess, cardStore.cardCommentSuccess),
			on(CardActions.removeCardCommentSuccess, cardStore.cardCommentSuccess),
			on(CardActions.reportCardCommentSuccess, cardStore.cardCommentSuccess),
			on(CardActions.deleteCardSuccess, cardStore.deleteCardSuccess),
			on(CardActions.fetchCardSuccess, cardStore.fetchCardSuccess),
			on(CardActions.updateCardTitleSuccess, cardStore.updateCardTitleSuccess),
			on(CardActions.updateCardColorSuccess, cardStore.updateCardColorSuccess),
			on(CardActions.updateCardHeightSuccess, cardStore.updateCardHeightSuccess),
			on(CardActions.duplicateCardSuccess, cardStore.duplicateCardSuccess),
		];

		const failureActions = [
			on(CardActions.createElementFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.deleteElementFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.moveElementFailure, () => reloadBoard()),
			on(CardActions.updateElementFailure, () => reloadBoard()),
			on(CardActions.voteInPollFailure, () => reloadBoard()),
			on(CardActions.setChecklistItemCheckedFailure, () => reloadBoard()),
			on(CardActions.reactToCardFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.updateCardSettingsFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.addCardCommentFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.editCardCommentFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.removeCardCommentFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.reportCardCommentFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.fetchCardFailure, ({ cardIds }) => reloadBoard(cardIds[0])),
			on(CardActions.updateCardTitleFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.updateCardColorFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.deleteCardFailure, ({ cardId }) => reloadBoard(cardId)),
			on(CardActions.duplicateCardFailure, ({ cardId }) => reloadBoard(cardId)),
		];

		const ariaLiveNotification = [
			on(CardActions.updateCardTitleSuccess, notifyUpdateCardTitleSuccess),
			on(CardActions.updateCardColorSuccess, notifyUpdateCardColorSuccess),
			on(CardActions.createElementSuccess, notifyCreateElementSuccess),
			on(CardActions.deleteElementSuccess, notifyDeleteElementSuccess),
			on(CardActions.moveElementSuccess, notifyMoveElementSuccess),
			on(CardActions.updateElementSuccess, notifyUpdateElementSuccess),
			on(CardActions.duplicateCardSuccess, notifyDuplicateCardSuccess),
		];

		handle(
			action,
			...successActions,
			...failureActions,
			...ariaLiveNotification,
			on(CardActions.disconnectSocket, disconnectSocketRequest)
		);
	};

	const { emitOnSocket, disconnectSocket, emitWithAck } = useSocketConnection(dispatch);

	const disconnectSocketRequest = () => {
		disconnectSocket();
	};

	const fetchCardRequest = async (payload: FetchCardRequestPayload) => {
		cardIdsToFetch = cardIdsToFetch.concat(payload.cardIds);
		_debouncedFetchCardEmit();
	};

	const _debouncedFetchCardEmit = useDebounceFn(
		() => {
			const batches = chunk(cardIdsToFetch, 50);
			batches.forEach((cardIds) => emitOnSocket("fetch-card-request", { cardIds }));
			cardIdsToFetch = [];
		},
		WAIT_AFTER_LAST_CALL_IN_MS,
		{ maxWait: MAX_WAIT_BEFORE_FIRST_CALL_IN_MS }
	);

	const createElementRequest = async (payload: CreateElementRequestPayload): Promise<AnyContentElement | undefined> => {
		try {
			const response = (await emitWithAck("create-element-request", payload)) as unknown;
			const anyContentElement = AnyContentElementSchema.parse(response);
			return anyContentElement;
		} catch {
			notifyError(t("components.elementTypeSelection.messageError"));
		}
	};

	const deleteElementRequest = async (payload: DeleteElementRequestPayload) => {
		emitOnSocket("delete-element-request", payload);
	};

	const moveElementRequest = async (payload: MoveElementRequestPayload) => {
		emitOnSocket("move-element-request", payload);
	};

	const updateElementRequest = async ({ element }: UpdateElementRequestPayload) => {
		emitOnSocket("update-element-request", {
			elementId: element.id,
			data: {
				type: element.type,
				content: element.content,
			},
		});
	};

	const addCardCommentRequest = async (payload: AddCardCommentRequestPayload) => {
		emitOnSocket("add-card-comment-request", payload);
	};

	const editCardCommentRequest = async (payload: EditCardCommentRequestPayload) => {
		emitOnSocket("edit-card-comment-request", payload);
	};

	const removeCardCommentRequest = async (payload: RemoveCardCommentRequestPayload) => {
		emitOnSocket("remove-card-comment-request", payload);
	};

	const reportCardCommentRequest = async (payload: ReportCardCommentRequestPayload) => {
		emitOnSocket("report-card-comment-request", payload);
	};

	const updateCardSettingsRequest = async (payload: UpdateCardSettingsRequestPayload) => {
		emitOnSocket("update-card-settings-request", payload);
	};

	const reactToCardRequest = async (payload: ReactToCardRequestPayload) => {
		emitOnSocket("react-to-card-request", payload);
	};

	const setChecklistItemCheckedRequest = async (payload: SetChecklistItemCheckedRequestPayload) => {
		emitOnSocket("set-checklist-item-checked-request", payload);
	};

	const voteInPollRequest = async (payload: VoteInPollRequestPayload) => {
		emitOnSocket("vote-in-poll-request", payload);
	};

	const deleteCardRequest = async (payload: DeleteCardRequestPayload) => {
		emitOnSocket("delete-card-request", payload);
	};

	const updateCardTitleRequest = (payload: UpdateCardTitleRequestPayload) => {
		emitOnSocket("update-card-title-request", payload);
	};

	const updateCardColorRequest = (payload: UpdateCardColorRequestPayload) => {
		emitOnSocket("update-card-color-request", payload);
	};

	const updateCardHeightRequest = (payload: UpdateCardHeightRequestPayload) => {
		emitOnSocket("update-card-height-request", payload);
	};

	const duplicateCardRequest = (payload: DuplicateCardRequestPayload) => {
		emitOnSocket("duplicate-card-request", payload);
	};

	const reloadBoard = (cardId = "") => {
		const boardStore = useBoardStore();
		const { board } = storeToRefs(boardStore);
		if (cardId) {
			const location = boardStore.getCardLocation(cardId);
			const { columnIndex, cardIndex } = location ?? {};
			if (board?.value && columnIndex !== undefined && cardIndex !== undefined && columnIndex > -1 && cardIndex > -1) {
				// remove card so that reloading data results in rerender
				board.value.columns[columnIndex].cards.splice(cardIndex, 1);
			}
		}
		boardStore.reloadBoard();
	};

	return {
		dispatch,
		disconnectSocketRequest,
		createElementRequest,
		deleteElementRequest,
		moveElementRequest,
		updateElementRequest,
		voteInPollRequest,
		setChecklistItemCheckedRequest,
		reactToCardRequest,
		updateCardSettingsRequest,
		addCardCommentRequest,
		editCardCommentRequest,
		removeCardCommentRequest,
		reportCardCommentRequest,
		deleteCardRequest,
		fetchCardRequest,
		updateCardTitleRequest,
		updateCardColorRequest,
		updateCardHeightRequest,
		duplicateCardRequest,
	};
};
