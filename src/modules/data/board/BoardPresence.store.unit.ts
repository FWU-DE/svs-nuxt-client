import { useBoardPresenceStore } from "./BoardPresence.store";
import { useSocketConnection } from "./socket/socket";
import { createTestEnvStore } from "@@/tests/test-utils/factory/env-test.utils";
import { createPinia, setActivePinia } from "pinia";
import type { Mock } from "vitest";

vi.mock("./socket/socket");
const mockedUseSocketConnection = vi.mocked(useSocketConnection);

const users = [
	{ id: "u1", firstName: "Cord", lastName: "Carl" },
	{ id: "u2", firstName: "Ada", lastName: "Lovelace" },
];

describe("BoardPresence.store", () => {
	let emitOnSocket: Mock;

	const setup = (socketEnabled = true) => {
		setActivePinia(createPinia());
		createTestEnvStore({ FEATURE_COLUMN_BOARD_SOCKET_ENABLED: socketEnabled });
		emitOnSocket = vi.fn();
		mockedUseSocketConnection.mockReturnValue({ emitOnSocket } as unknown as ReturnType<typeof useSocketConnection>);
		return useBoardPresenceStore();
	};

	beforeEach(() => vi.clearAllMocks());

	it("keeps the editors the server reports per board", () => {
		const store = setup();

		store.onAction({ type: "board-presence-updated", payload: { boardId: "b1", users } });
		store.onAction({ type: "fetch-board-presence-success", payload: { boardId: "b2", users: [users[1]] } });

		expect(store.editorsOf("b1")).toEqual(users);
		expect(store.editorsOf("b2")).toEqual([users[1]]);
		expect(store.editorsOf("b3")).toEqual([]);
	});

	it("ignores other socket events and malformed payloads", () => {
		const store = setup();

		store.onAction({ type: "fetch-board-success", payload: { boardId: "b1", users } });
		store.onAction({ type: "board-presence-updated", payload: { boardId: "b1" } });

		expect(store.editorsOf("b1")).toEqual([]);
	});

	it("asks the server for the list and leaves a board", () => {
		const store = setup();
		store.onAction({ type: "board-presence-updated", payload: { boardId: "b1", users } });

		store.fetchPresence("b1");
		store.leaveBoard("b1");

		expect(emitOnSocket).toHaveBeenCalledWith("fetch-board-presence-request", { boardId: "b1" });
		expect(emitOnSocket).toHaveBeenCalledWith("leave-board-presence-request", { boardId: "b1" });
		expect(store.editorsOf("b1")).toEqual([]);
	});

	it("does not open a socket in REST mode", () => {
		const store = setup(false);

		store.fetchPresence("b1");

		expect(mockedUseSocketConnection).not.toHaveBeenCalled();
		expect(store.editorsOf("b1")).toEqual([]);
	});
});
