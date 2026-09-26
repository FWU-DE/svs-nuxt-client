import BoardPresenceAvatars from "./BoardPresenceAvatars.vue";
import { createTestAppStoreWithUser } from "@@/tests/test-utils/factory/application-test.utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { type BoardPresenceUser, useBoardPresenceStore } from "@data-board";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

vi.mock("@data-board/socket/socket");

const person = (id: string, firstName: string, lastName: string): BoardPresenceUser => ({ id, firstName, lastName });

describe("BoardPresenceAvatars", () => {
	const setup = (editors: BoardPresenceUser[], viewerId = "me") => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		createTestAppStoreWithUser(viewerId);
		const store = useBoardPresenceStore();
		store.onAction({ type: "board-presence-updated", payload: { boardId: "b1", users: editors } });
		const fetchPresence = vi.spyOn(store, "fetchPresence").mockImplementation(() => undefined);

		const wrapper = mount(BoardPresenceAvatars, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { boardId: "b1" },
		});
		return { wrapper, fetchPresence };
	};

	it("shows the other editors with their initials", () => {
		const { wrapper } = setup([
			person("me", "Ich", "Selbst"),
			person("u1", "Cord", "Carl"),
			person("u2", "ada", "lovelace"),
		]);

		expect(wrapper.find("[data-testid=board-presence-user-me]").exists()).toBe(false);
		expect(wrapper.get("[data-testid=board-presence-user-u1]").text()).toBe("CC");
		expect(wrapper.get("[data-testid=board-presence-user-u2]").text()).toBe("AL");
	});

	it("is hidden when the viewer is the only editor", () => {
		const { wrapper } = setup([person("me", "Ich", "Selbst")]);

		expect(wrapper.find("[data-testid=board-presence]").exists()).toBe(false);
	});

	it("folds everyone beyond three into a +N avatar", () => {
		const editors = ["a", "b", "c", "d", "e"].map((id) => person(id, id.toUpperCase(), "X"));
		const { wrapper } = setup(editors);

		expect(wrapper.findAll("[data-testid^=board-presence-user-]")).toHaveLength(3);
		expect(wrapper.get("[data-testid=board-presence-more]").text()).toContain("components.board.presence.more");
	});

	it("asks for the list when it mounts, in case the board loaded first", () => {
		const { fetchPresence } = setup([]);

		expect(fetchPresence).toHaveBeenCalledWith("b1");
	});
});
