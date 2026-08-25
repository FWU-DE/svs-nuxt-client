import {
	AddCardCommentRequestPayload,
	CardCommentFailurePayload,
	CardCommentSuccessPayload,
	CreateElementFailurePayload,
	CreateElementRequestPayload,
	CreateElementSuccessPayload,
	DeleteCardFailurePayload,
	DeleteCardRequestPayload,
	DeleteCardSuccessPayload,
	DeleteElementFailurePayload,
	DeleteElementRequestPayload,
	DeleteElementSuccessPayload,
	DisconnectSocketRequestPayload,
	DuplicateCardFailurePayload,
	DuplicateCardRequestPayload,
	DuplicateCardSuccessPayload,
	FetchCardFailurePayload,
	FetchCardRequestPayload,
	FetchCardSuccessPayload,
	MoveElementFailurePayload,
	MoveElementRequestPayload,
	MoveElementSuccessPayload,
	EditCardCommentRequestPayload,
	ReactToCardFailurePayload,
	ReactToCardRequestPayload,
	ReactToCardSuccessPayload,
	RemoveCardCommentRequestPayload,
	SetChecklistItemCheckedFailurePayload,
	SetChecklistItemCheckedRequestPayload,
	SetChecklistItemCheckedSuccessPayload,
	ReportCardCommentRequestPayload,
	UpdateCardColorFailurePayload,
	UpdateCardColorRequestPayload,
	UpdateCardColorSuccessPayload,
	UpdateCardHeightFailurePayload,
	UpdateCardHeightRequestPayload,
	UpdateCardHeightSuccessPayload,
	UpdateCardTitleFailurePayload,
	UpdateCardTitleRequestPayload,
	UpdateCardTitleSuccessPayload,
	UpdateElementFailurePayload,
	UpdateElementRequestPayload,
	UpdateElementSuccessPayload,
	VoteInPollFailurePayload,
	VoteInPollRequestPayload,
	VoteInPollSuccessPayload,
} from "./cardActionPayload.types";
import { createAction, props } from "@/types/board/ActionFactory";

export const disconnectSocket = createAction("disconnect-socket", props<DisconnectSocketRequestPayload>());

export const createElementRequest = createAction("create-element-request", props<CreateElementRequestPayload>());
export const createElementSuccess = createAction("create-element-success", props<CreateElementSuccessPayload>());
export const createElementFailure = createAction("create-element-failure", props<CreateElementFailurePayload>());

export const deleteElementRequest = createAction("delete-element-request", props<DeleteElementRequestPayload>());
export const deleteElementSuccess = createAction("delete-element-success", props<DeleteElementSuccessPayload>());
export const deleteElementFailure = createAction("delete-element-failure", props<DeleteElementFailurePayload>());

export const moveElementRequest = createAction("move-element-request", props<MoveElementRequestPayload>());
export const moveElementSuccess = createAction("move-element-success", props<MoveElementSuccessPayload>());
export const moveElementFailure = createAction("move-element-failure", props<MoveElementFailurePayload>());

export const updateElementRequest = createAction("update-element-request", props<UpdateElementRequestPayload>());
export const updateElementSuccess = createAction("update-element-success", props<UpdateElementSuccessPayload>());
export const updateElementFailure = createAction("update-element-failure", props<UpdateElementFailurePayload>());

export const addCardCommentRequest = createAction("add-card-comment-request", props<AddCardCommentRequestPayload>());
export const addCardCommentSuccess = createAction("add-card-comment-success", props<CardCommentSuccessPayload>());
export const addCardCommentFailure = createAction("add-card-comment-failure", props<CardCommentFailurePayload>());

export const editCardCommentRequest = createAction("edit-card-comment-request", props<EditCardCommentRequestPayload>());
export const editCardCommentSuccess = createAction("edit-card-comment-success", props<CardCommentSuccessPayload>());
export const editCardCommentFailure = createAction("edit-card-comment-failure", props<CardCommentFailurePayload>());

export const removeCardCommentRequest = createAction(
	"remove-card-comment-request",
	props<RemoveCardCommentRequestPayload>()
);
export const removeCardCommentSuccess = createAction("remove-card-comment-success", props<CardCommentSuccessPayload>());
export const removeCardCommentFailure = createAction("remove-card-comment-failure", props<CardCommentFailurePayload>());

export const reportCardCommentRequest = createAction(
	"report-card-comment-request",
	props<ReportCardCommentRequestPayload>()
);
export const reportCardCommentSuccess = createAction("report-card-comment-success", props<CardCommentSuccessPayload>());
export const reportCardCommentFailure = createAction("report-card-comment-failure", props<CardCommentFailurePayload>());

export const reactToCardRequest = createAction("react-to-card-request", props<ReactToCardRequestPayload>());
export const reactToCardSuccess = createAction("react-to-card-success", props<ReactToCardSuccessPayload>());
export const reactToCardFailure = createAction("react-to-card-failure", props<ReactToCardFailurePayload>());

export const setChecklistItemCheckedRequest = createAction(
	"set-checklist-item-checked-request",
	props<SetChecklistItemCheckedRequestPayload>()
);
export const setChecklistItemCheckedSuccess = createAction(
	"set-checklist-item-checked-success",
	props<SetChecklistItemCheckedSuccessPayload>()
);
export const setChecklistItemCheckedFailure = createAction(
	"set-checklist-item-checked-failure",
	props<SetChecklistItemCheckedFailurePayload>()
);

export const voteInPollRequest = createAction("vote-in-poll-request", props<VoteInPollRequestPayload>());
export const voteInPollSuccess = createAction("vote-in-poll-success", props<VoteInPollSuccessPayload>());
export const voteInPollFailure = createAction("vote-in-poll-failure", props<VoteInPollFailurePayload>());

export const deleteCardRequest = createAction("delete-card-request", props<DeleteCardRequestPayload>());
export const deleteCardSuccess = createAction("delete-card-success", props<DeleteCardSuccessPayload>());
export const deleteCardFailure = createAction("delete-card-failure", props<DeleteCardFailurePayload>());

export const fetchCardRequest = createAction("fetch-card-request", props<FetchCardRequestPayload>());
export const fetchCardSuccess = createAction("fetch-card-success", props<FetchCardSuccessPayload>());
export const fetchCardFailure = createAction("fetch-card-failure", props<FetchCardFailurePayload>());

export const updateCardTitleRequest = createAction("update-card-title-request", props<UpdateCardTitleRequestPayload>());
export const updateCardTitleSuccess = createAction("update-card-title-success", props<UpdateCardTitleSuccessPayload>());
export const updateCardTitleFailure = createAction("update-card-title-failure", props<UpdateCardTitleFailurePayload>());

export const updateCardColorRequest = createAction("update-card-color-request", props<UpdateCardColorRequestPayload>());
export const updateCardColorSuccess = createAction("update-card-color-success", props<UpdateCardColorSuccessPayload>());
export const updateCardColorFailure = createAction("update-card-color-failure", props<UpdateCardColorFailurePayload>());

export const duplicateCardRequest = createAction("duplicate-card-request", props<DuplicateCardRequestPayload>());
export const duplicateCardSuccess = createAction("duplicate-card-success", props<DuplicateCardSuccessPayload>());
export const duplicateCardFailure = createAction("duplicate-card-failure", props<DuplicateCardFailurePayload>());

export const updateCardHeightRequest = createAction(
	"update-card-height-request",
	props<UpdateCardHeightRequestPayload>()
);
export const updateCardHeightSuccess = createAction(
	"update-card-height-success",
	props<UpdateCardHeightSuccessPayload>()
);
export const updateCardHeightFailure = createAction(
	"update-card-height-failure",
	props<UpdateCardHeightFailurePayload>()
);
