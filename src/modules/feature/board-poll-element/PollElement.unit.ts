import PollElement from "./PollElement.vue";
import PollElementDisplay from "./PollElementDisplay.vue";
import PollElementEdit from "./PollElementEdit.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ContentElementType, PollElementResponse, PollResultVisibility } from "@api-server";
import { useCardStore } from "@data-board";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

const updateElementRequest = vi.fn();
const voteInPollRequest = vi.fn();

vi.mock("@data-board", async (importOriginal) => {
	const original = await importOriginal<typeof import("@data-board")>();

	return {
		...original,
		useBoardFocusHandler: vi.fn(),
		useCardStore: vi.fn(() => ({ updateElementRequest, voteInPollRequest })),
	};
});

const buildElement = (content: Partial<PollElementResponse["content"]> = {}): PollElementResponse => ({
	id: "poll-1",
	type: ContentElementType.POLL,
	timestamps: { createdAt: "2026-01-01T00:00:00Z", lastUpdatedAt: "2026-01-01T00:00:00Z" },
	content: {
		question: "Wie sicher fühlt ihr euch?",
		options: [
			{ id: "opt-1", text: "Sicher", count: 2 },
			{ id: "opt-2", text: "Noch unsicher", count: 1 },
		],
		anonymous: false,
		multipleChoice: false,
		closed: false,
		showResults: PollResultVisibility.ALWAYS,
		resultsReleased: false,
		resultsVisible: true,
		voterCount: 3,
		ownVote: [],
		...content,
	},
});

const setup = (options: { isEditMode?: boolean; element?: PollElementResponse } = {}) => {
	setActivePinia(createTestingPinia());
	const element = options.element ?? buildElement();

	const wrapper = mount(PollElement, {
		global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		props: {
			element,
			isEditMode: options.isEditMode ?? false,
			columnIndex: 0,
			rowIndex: 0,
			elementIndex: 0,
		},
	});

	return { wrapper, element };
};

describe("PollElement", () => {
	beforeEach(() => {
		updateElementRequest.mockClear();
		voteInPollRequest.mockClear();
		vi.mocked(useCardStore).mockReturnValue({
			updateElementRequest,
			voteInPollRequest,
		} as unknown as ReturnType<typeof useCardStore>);
	});

	describe("when the element is displayed to a participant", () => {
		it("should render the question the teacher entered", () => {
			const { wrapper } = setup();

			expect(wrapper.text()).toContain("Wie sicher fühlt ihr euch?");
		});

		it("should render the text of every answer option", () => {
			const { wrapper } = setup();

			const text = wrapper.text();
			expect(text).toContain("Sicher");
			expect(text).toContain("Noch unsicher");
		});

		it("should send a vote for the clicked option", async () => {
			const { wrapper } = setup();

			wrapper.findComponent(PollElementDisplay).vm.$emit("vote", ["opt-2"]);
			await flushPromises();

			expect(voteInPollRequest).toHaveBeenCalledWith({ elementId: "poll-1", optionIds: ["opt-2"] });
		});
	});

	describe("when a teacher edits the poll", () => {
		it("should persist the edited question", async () => {
			const { wrapper } = setup({ isEditMode: true });

			const edit = wrapper.findComponent(PollElementEdit);
			edit.vm.$emit("update:modelValue", {
				...edit.props("modelValue"),
				question: "Neue Frage",
			});
			await flushPromises();
			await vi.waitFor(() => expect(updateElementRequest).toHaveBeenCalled());

			const [{ element }] = updateElementRequest.mock.calls.at(-1) as [{ element: PollElementResponse }];
			expect(element.content.question).toBe("Neue Frage");
		});

		it("should persist edited option texts", async () => {
			const { wrapper } = setup({ isEditMode: true });

			const edit = wrapper.findComponent(PollElementEdit);
			edit.vm.$emit("update:modelValue", {
				...edit.props("modelValue"),
				options: [
					{ id: "opt-1", text: "Ganz sicher" },
					{ id: "opt-2", text: "Noch unsicher" },
				],
			});
			await flushPromises();
			await vi.waitFor(() => expect(updateElementRequest).toHaveBeenCalled());

			const [{ element }] = updateElementRequest.mock.calls.at(-1) as [{ element: PollElementResponse }];
			expect(element.content.options.map((option) => option.text)).toEqual(["Ganz sicher", "Noch unsicher"]);
		});

		it("should hand the edit form the poll definition, not the tally", () => {
			const { wrapper } = setup({ isEditMode: true });

			const modelValue = wrapper.findComponent(PollElementEdit).props("modelValue");

			expect(modelValue).toEqual({
				question: "Wie sicher fühlt ihr euch?",
				options: [
					{ id: "opt-1", text: "Sicher" },
					{ id: "opt-2", text: "Noch unsicher" },
				],
				anonymous: false,
				multipleChoice: false,
				closed: false,
				showResults: PollResultVisibility.ALWAYS,
				resultsReleased: false,
			});
		});
	});
});
