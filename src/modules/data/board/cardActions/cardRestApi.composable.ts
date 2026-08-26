import { useBoardStore } from "../Board.store";
import { useBoardApi } from "../BoardApi.composable";
import { useCardStore } from "../Card.store";
import { useSharedCardRequestPool } from "../CardRequestPool.composable";
import { useSharedEditMode } from "../edit-mode.composable";
import {
	CreateElementRequestPayload,
	DeleteCardRequestPayload,
	DeleteElementRequestPayload,
	DuplicateCardRequestPayload,
	FetchCardRequestPayload,
	MoveElementRequestPayload,
	UpdateCardColorRequestPayload,
	UpdateCardHeightRequestPayload,
	UpdateCardTitleRequestPayload,
	AddCardCommentRequestPayload,
	EditCardCommentRequestPayload,
	ReactToCardRequestPayload,
	UpdateCardSettingsRequestPayload,
	RemoveCardCommentRequestPayload,
	ReportCardCommentRequestPayload,
	SetChecklistItemCheckedRequestPayload,
	UpdateElementRequestPayload,
	VoteInPollRequestPayload,
} from "./cardActionPayload.types";
import { AnyContentElement } from "@/types/board/ContentElement";
import { delay } from "@/utils/helpers";
import {
	CardCommentResponse,
	ContentElementType,
	CopyStatusEnum,
	ExternalToolElementResponse,
	PreferredToolListResponse,
	PreferredToolResponse,
	ToolContextType,
} from "@api-server";
import { notifyError } from "@data-app";
import {
	ContextExternalTool,
	ContextExternalToolConfigurationTemplate,
	ContextExternalToolSave,
	useContextExternalToolApi,
	usePreferredExternalToolStore,
} from "@data-external-tool";
import { ApiErrorHandlerFactory, BoardObjectType, ErrorType, useErrorHandler } from "@util-error-handling";
import { AxiosResponse } from "axios";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";

export const useCardRestApi = () => {
	const boardStore = useBoardStore();
	const cardStore = useCardStore();
	const { preferredExternalTool } = storeToRefs(usePreferredExternalToolStore());

	const { fetchCard: fetchCardFromApi } = useSharedCardRequestPool();
	const { handleError, notifyWithTemplate } = useErrorHandler();

	const {
		createElementCall,
		deleteElementCall,
		deleteCardCall,
		updateElementCall,
		voteInPollCall,
		setChecklistItemCheckedCall,
		reactToCardCall,
		updateCardSettingsCall,
		addCardCommentCall,
		editCardCommentCall,
		removeCardCommentCall,
		reportCardCommentCall,
		moveElementCall,
		updateCardTitle,
		updateCardColor,
		updateCardHeightCall,
		duplicateCardCall,
	} = useBoardApi();

	const { fetchPreferredTools, createContextExternalToolCall, fetchAvailableToolsForContextCall } =
		useContextExternalToolApi();

	const { setEditModeId } = useSharedEditMode();

	const { t } = useI18n();

	const createElementRequest = async (payload: CreateElementRequestPayload): Promise<AnyContentElement | undefined> => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			const params = {
				type: payload.type,
				toPosition: payload.toPosition,
			};
			const newElement = await createElementCall(payload.cardId, params);
			return cardStore.createElementSuccess({
				...payload,
				newElement: newElement.data,
				isOwnAction: true,
			});
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notDeleted", "boardCard"),
			});
		}
	};

	const createPreferredElement = async (
		payload: CreateElementRequestPayload,
		tool: PreferredToolResponse
	): Promise<AnyContentElement | undefined> => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			const params = {
				type: payload.type,
				toPosition: payload.toPosition,
			};
			const newElement = await createElementCall(payload.cardId, params);

			if (tool.schoolExternalToolId) {
				const availableTools: ContextExternalToolConfigurationTemplate[] = await fetchAvailableToolsForContextCall(
					newElement.data.id,
					ToolContextType.BOARD_ELEMENT
				);

				const preferredTool: ContextExternalToolConfigurationTemplate | undefined = availableTools.find(
					(availableTool) => availableTool.schoolExternalToolId === tool.schoolExternalToolId
				);

				if (!preferredTool?.parameters.length) {
					const contextExternalToolSave: ContextExternalToolSave = {
						schoolToolId: tool.schoolExternalToolId,
						contextId: newElement.data.id,
						contextType: ToolContextType.BOARD_ELEMENT,
						parameters: [],
					};

					const contextExternalTool: ContextExternalTool = await createContextExternalToolCall(contextExternalToolSave);

					const isExternalToolElement = (element: AnyContentElement): element is ExternalToolElementResponse =>
						element.type === ContentElementType.EXTERNAL_TOOL;

					if (isExternalToolElement(newElement.data)) {
						newElement.data.content.contextExternalToolId = contextExternalTool.id;
					}

					await updateElementCall(newElement.data);
				} else {
					preferredExternalTool.value = preferredTool;
				}
			}

			return cardStore.createElementSuccess({
				...payload,
				newElement: newElement.data,
				isOwnAction: true,
			});
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notDeleted", "boardCard"),
			});
		}
	};

	const getPreferredTools = async (contextType: ToolContextType): Promise<PreferredToolResponse[] | undefined> => {
		try {
			const preferredTools: AxiosResponse<PreferredToolListResponse> = await fetchPreferredTools(contextType);

			return preferredTools.data.data;
		} catch {
			notifyError(t("components.board.preferredTools.notification.error.notLoaded"));
		}
	};

	const deleteElementRequest = async (payload: DeleteElementRequestPayload) => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			await deleteElementCall(payload.elementId);
			cardStore.deleteElementSuccess({ ...payload, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notDeleted", "boardElement"),
			});
		}
	};

	const moveElementRequest = async (payload: MoveElementRequestPayload) => {
		const card = cardStore.getCard(payload.toCardId);
		if (card === undefined) return;

		try {
			await moveElementCall(payload.elementId, payload.toCardId, payload.toPosition);
			cardStore.moveElementSuccess({ ...payload, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notMoved", "boardElement"),
			});
		}
	};

	const updateElementRequest = async (payload: UpdateElementRequestPayload) => {
		try {
			const success = await updateElementCall(payload.element);
			cardStore.updateElementSuccess({
				elementId: success.data.id,
				data: {
					type: success.data.type,
					content: success.data.content,
				},
				isOwnAction: true,
			});
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplate("notUpdated", "boardElement"),
			});
		}
	};

	const commentRequest = async (cardId: string, call: () => Promise<{ data: CardCommentResponse }>) => {
		try {
			const response = await call();
			cardStore.cardCommentSuccess({ cardId, comment: response.data, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplate("notUpdated", "boardCard"),
			});
		}
	};

	const addCardCommentRequest = async (payload: AddCardCommentRequestPayload) =>
		commentRequest(payload.cardId, () => addCardCommentCall(payload.cardId, payload.text));

	const editCardCommentRequest = async (payload: EditCardCommentRequestPayload) =>
		commentRequest(payload.cardId, () => editCardCommentCall(payload.cardId, payload.commentId, payload.text));

	const removeCardCommentRequest = async (payload: RemoveCardCommentRequestPayload) =>
		commentRequest(payload.cardId, () => removeCardCommentCall(payload.cardId, payload.commentId));

	const reportCardCommentRequest = async (payload: ReportCardCommentRequestPayload) =>
		commentRequest(payload.cardId, () => reportCardCommentCall(payload.cardId, payload.commentId, payload.reason));

	const setChecklistItemCheckedRequest = async (payload: SetChecklistItemCheckedRequestPayload) => {
		try {
			const response = await setChecklistItemCheckedCall(payload.elementId, payload.itemId, payload.checked);
			cardStore.setChecklistItemCheckedSuccess({
				elementId: payload.elementId,
				element: response.data,
				isOwnAction: true,
			});
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplate("notUpdated", "boardElement"),
			});
		}
	};

	const updateCardSettingsRequest = async (payload: UpdateCardSettingsRequestPayload) => {
		try {
			const { cardId, ...settings } = payload;
			const response = await updateCardSettingsCall(cardId, settings);
			cardStore.updateCardSettingsSuccess({ cardId, card: response.data, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplate("notUpdated", "boardCard"),
			});
		}
	};

	const reactToCardRequest = async (payload: ReactToCardRequestPayload) => {
		try {
			const response = await reactToCardCall(payload.cardId, payload.value);
			cardStore.reactToCardSuccess({ cardId: payload.cardId, card: response.data, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplate("notUpdated", "boardCard"),
			});
		}
	};

	const voteInPollRequest = async (payload: VoteInPollRequestPayload) => {
		try {
			const response = await voteInPollCall(payload.elementId, payload.optionIds);
			cardStore.voteInPollSuccess({
				elementId: payload.elementId,
				pollElement: response.data,
				isOwnAction: true,
			});
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplate("notUpdated", "boardElement"),
			});
		}
	};

	const deleteCardRequest = async (payload: DeleteCardRequestPayload) => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			await deleteCardCall(payload.cardId);
			boardStore.deleteCardSuccess({ ...payload, isOwnAction: true });
			cardStore.deleteCardSuccess({ ...payload, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notDeleted", "boardCard"),
			});
		}
	};

	const duplicateCardRequest = async (payload: DuplicateCardRequestPayload) => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			const duplicatedCard = await duplicateCardCall(payload.cardId);

			if (duplicatedCard.id) {
				boardStore.duplicateCardSuccess({
					cardId: payload.cardId,
					duplicatedCard,
					status: CopyStatusEnum.SUCCESS,
					isOwnAction: true,
				});
				cardStore.duplicateCardSuccess({
					cardId: payload.cardId,
					duplicatedCard,
					status: CopyStatusEnum.SUCCESS,
					isOwnAction: true,
				});
			}
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notDuplicated", "boardCard"),
			});
		}
	};

	const fetchCardRequest = async (payload: FetchCardRequestPayload): Promise<void> => {
		await delay(100);
		try {
			const promises = payload.cardIds.map(fetchCardFromApi);
			const cards = await Promise.all(promises);
			cardStore.fetchCardSuccess({ cards, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notLoaded", "boardCard"),
			});
		}
	};

	const updateCardTitleRequest = async (payload: UpdateCardTitleRequestPayload): Promise<void> => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			await updateCardTitle(payload.cardId, payload.newTitle);
			cardStore.updateCardTitleSuccess({ ...payload, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notUpdated"),
			});
		}
	};

	const updateCardColorRequest = async (payload: UpdateCardColorRequestPayload): Promise<void> => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			await updateCardColor(payload.cardId, payload.backgroundColor);
			cardStore.updateCardColorSuccess({ ...payload, isOwnAction: true });
		} catch (error) {
			handleError(error, {
				404: notifyWithTemplateAndReload("notUpdated"),
			});
		}
	};

	const updateCardHeightRequest = async (payload: UpdateCardHeightRequestPayload) => {
		const card = cardStore.getCard(payload.cardId);
		if (card === undefined) return;

		try {
			await updateCardHeightCall(payload.cardId, payload.newHeight);
			cardStore.updateCardHeightSuccess({ ...payload, isOwnAction: true });
		} catch (error) {
			handleError(error, {});
		}
	};

	const notifyWithTemplateAndReload: ApiErrorHandlerFactory =
		(errorType: ErrorType, boardObjectType?: BoardObjectType) => () => {
			notifyWithTemplate(errorType, boardObjectType)();
			boardStore.reloadBoard();
			setEditModeId(undefined);
		};

	// this unused function is added to make sure that the same name is used in both socketApi and restApi
	// eslint-disable-next-line arrow-body-style
	const disconnectSocketRequest = (): void => {
		return;
	};

	return {
		createElementRequest,
		createPreferredElement,
		getPreferredTools,
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
		duplicateCardRequest,
		deleteCardRequest,
		fetchCardRequest,
		updateCardTitleRequest,
		updateCardColorRequest,
		updateCardHeightRequest,
		disconnectSocketRequest,
	};
};
