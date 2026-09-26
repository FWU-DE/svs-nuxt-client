import { useSocketConnection } from "./socket/socket";
import { Action } from "@/types/board/ActionFactory";
import { useEnvConfig } from "@data-env";
import { defineStore } from "pinia";
import { ref } from "vue";

export type BoardPresenceUser = {
	id: string;
	firstName: string;
	lastName: string;
};

type BoardPresencePayload = {
	boardId: string;
	users: BoardPresenceUser[];
};

const isPresencePayload = (payload: unknown): payload is BoardPresencePayload =>
	typeof payload === "object" &&
	payload !== null &&
	typeof (payload as BoardPresencePayload).boardId === "string" &&
	Array.isArray((payload as BoardPresencePayload).users);

/**
 * Who with edit permission is on which board right now, as the server's board
 * gateway reports it (`board-presence-updated` when the list changes, the
 * answer to `fetch-board-presence-request` on demand). Only in socket mode:
 * without the socket there is no one to ask.
 */
export const useBoardPresenceStore = defineStore("boardPresenceStore", () => {
	const editorsByBoard = ref<Record<string, BoardPresenceUser[]>>({});
	const isSocketEnabled = useEnvConfig().value.FEATURE_COLUMN_BOARD_SOCKET_ENABLED;

	const onAction = (action: Action) => {
		if (action.type !== "board-presence-updated" && action.type !== "fetch-board-presence-success") return;
		if (!isPresencePayload(action.payload)) return;
		editorsByBoard.value = { ...editorsByBoard.value, [action.payload.boardId]: action.payload.users };
	};

	const { emitOnSocket } = isSocketEnabled ? useSocketConnection(onAction) : { emitOnSocket: undefined };

	const editorsOf = (boardId: string): BoardPresenceUser[] => editorsByBoard.value[boardId] ?? [];

	const fetchPresence = (boardId: string) => emitOnSocket?.("fetch-board-presence-request", { boardId });

	const leaveBoard = (boardId: string) => {
		emitOnSocket?.("leave-board-presence-request", { boardId });
		editorsByBoard.value = Object.fromEntries(Object.entries(editorsByBoard.value).filter(([id]) => id !== boardId));
	};

	return { isSocketEnabled, editorsOf, fetchPresence, leaveBoard, onAction };
});
