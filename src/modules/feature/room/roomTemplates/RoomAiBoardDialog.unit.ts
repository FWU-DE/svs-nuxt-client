import RoomAiBoardDialog from "./RoomAiBoardDialog.vue";
import RoomTemplateStructure from "./RoomTemplateStructure.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout } from "@api-server";
import { notifyError } from "@data-app";
import { ResolvedBoard, useBoardAiTemplate, useRoomTemplate } from "@data-room";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { computed, ref } from "vue";

vi.mock("@data-room", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-room")>()),
	useBoardAiTemplate: vi.fn(),
	useRoomTemplate: vi.fn(),
}));

vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	notifyError: vi.fn(),
}));

describe("RoomAiBoardDialog", () => {
	const suggestion: ResolvedBoard = {
		title: "Brüche",
		layout: BoardLayout.COLUMNS,
		columns: [
			{ title: "Woche 1", cards: [{ title: "Ziele", elements: [{ kind: "text", text: "<p>Los</p>" }] }] },
			{ title: "Woche 2", cards: [] },
		],
	};

	const setupAi = () => {
		const boards = ref<ResolvedBoard[]>([]);
		const ai = {
			board: computed(() => boards.value[0]),
			boards,
			cancel: vi.fn(),
			generate: vi.fn(),
			hasFailed: ref(false),
			isBudgetExceeded: ref(false),
			isEmpty: computed(() => boards.value.length === 0),
			isForbidden: ref(false),
			isGenerating: ref(false),
			reset: vi.fn(),
		};
		vi.mocked(useBoardAiTemplate).mockReturnValue(ai as unknown as ReturnType<typeof useBoardAiTemplate>);

		const builder = {
			applyBoard: vi.fn().mockResolvedValue({ boardId: "board-id", isComplete: true }),
			applyTemplate: vi.fn(),
			createdKeys: ref<string[]>([]),
			isApplying: ref(false),
			progress: computed(() => 0),
		};
		vi.mocked(useRoomTemplate).mockReturnValue(builder as unknown as ReturnType<typeof useRoomTemplate>);

		return { ai, builder };
	};

	let wrapper: VueWrapper;

	const setup = () => {
		setActivePinia(createTestingPinia());
		const mocks = setupAi();

		wrapper = mount(RoomAiBoardDialog, {
			attachTo: document.body,
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { modelValue: true, roomId: "room-id" },
		});

		const find = (testId: string) => wrapper.findComponent({ name: "VCard" }).find(`[data-testid="${testId}"]`);

		const typePrompt = async (value: string) => {
			await find("room-ai-board-prompt").find("textarea").setValue(value);
		};

		return { ...mocks, find, typePrompt };
	};

	afterEach(() => {
		wrapper?.unmount();
		vi.clearAllMocks();
	});

	it("should not generate from a prompt that is too short", async () => {
		const { find, typePrompt } = setup();

		await typePrompt("ab");

		expect(find("room-ai-board-generate-btn").attributes("disabled")).toBeDefined();
	});

	it("should ask the ai for a board of this room", async () => {
		const { ai, find, typePrompt } = setup();
		await typePrompt("  Bruchrechnung mit Übungen ");

		await find("room-ai-board-generate-btn").trigger("click");

		expect(ai.generate).toHaveBeenCalledWith("room-id", "Bruchrechnung mit Übungen", { maxColumns: undefined });
	});

	it("should pass the number of columns on", async () => {
		const { ai, find, typePrompt } = setup();
		await typePrompt("Bruchrechnung");
		await find("room-ai-board-max-columns").find("input").setValue("4");

		await find("room-ai-board-generate-btn").trigger("click");

		expect(ai.generate).toHaveBeenCalledWith("room-id", "Bruchrechnung", { maxColumns: 4 });
	});

	it("should not generate with a number of columns the server would reject", async () => {
		const { find, typePrompt } = setup();
		await typePrompt("Bruchrechnung");

		await find("room-ai-board-max-columns").find("input").setValue("20");

		expect(find("room-ai-board-generate-btn").attributes("disabled")).toBeDefined();
	});

	it("should show the suggestion while it grows and offer to stop it", async () => {
		const { ai, find } = setup();

		ai.isGenerating.value = true;
		ai.boards.value = [suggestion];
		await flushPromises();

		expect(wrapper.findComponent(RoomTemplateStructure).props("boards")).toEqual([suggestion]);
		expect(find("room-ai-board-create-btn").attributes("disabled")).toBeDefined();

		await find("room-ai-board-stop-btn").trigger("click");
		expect(ai.cancel).toHaveBeenCalled();
	});

	it("should offer a new suggestion once one is there", async () => {
		const { ai, find } = setup();

		ai.boards.value = [suggestion];
		await flushPromises();

		expect(find("room-ai-board-generate-btn").text()).toBe("pages.roomDetails.aiBoard.regenerate");
	});

	it.each([
		{ flag: "isBudgetExceeded" as const, message: "common.ai.budgetExceeded" },
		{ flag: "isForbidden" as const, message: "pages.roomDetails.aiBoard.forbidden" },
		{ flag: undefined, message: "pages.roomDetails.aiBoard.error" },
	])("should explain a failure with $message", async ({ flag, message }) => {
		const { ai, find } = setup();

		ai.hasFailed.value = true;
		if (flag) ai[flag].value = true;
		await flushPromises();

		expect(find("room-ai-board-error").text()).toBe(message);
	});

	it("should create the suggested board and hand its id on", async () => {
		const { ai, builder, find } = setup();
		ai.boards.value = [suggestion];
		await flushPromises();

		await find("room-ai-board-create-btn").trigger("click");
		await flushPromises();

		expect(builder.applyBoard).toHaveBeenCalledWith("room-id", suggestion);
		expect(wrapper.emitted("created")).toEqual([["board-id"]]);
		expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
		expect(notifyError).not.toHaveBeenCalled();
	});

	it("should still open a board whose content is incomplete, and say so", async () => {
		const { ai, builder, find } = setup();
		builder.applyBoard.mockResolvedValue({ boardId: "board-id", isComplete: false });
		ai.boards.value = [suggestion];
		await flushPromises();

		await find("room-ai-board-create-btn").trigger("click");
		await flushPromises();

		expect(notifyError).toHaveBeenCalledWith("pages.roomDetails.aiBoard.incomplete");
		expect(wrapper.emitted("created")).toEqual([["board-id"]]);
	});

	it("should stay open with an error when the board cannot be created", async () => {
		const { ai, builder, find } = setup();
		builder.applyBoard.mockResolvedValue({ boardId: undefined, isComplete: false });
		ai.boards.value = [suggestion];
		await flushPromises();

		await find("room-ai-board-create-btn").trigger("click");
		await flushPromises();

		expect(wrapper.emitted("created")).toBeUndefined();
		expect(find("room-ai-board-error").text()).toBe("pages.roomDetails.aiBoard.createError");
	});

	it("should show the progress while the board is created", async () => {
		const { ai, builder, find } = setup();
		ai.boards.value = [suggestion];
		builder.isApplying.value = true;
		await flushPromises();

		expect(find("room-ai-board-progress").exists()).toBe(true);
		expect(wrapper.findComponent(RoomTemplateStructure).props("showProgress")).toBe(true);
		expect(find("room-ai-board-cancel-btn").attributes("disabled")).toBeDefined();
	});
});
