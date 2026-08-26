import de from "@/locales/de";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ContentElementType } from "@api-server";
import { ChecklistElement } from "@feature-board-checklist-element";
import { CodeElement } from "@feature-board-code-element";
import { DeadlineElement } from "@feature-board-deadline-element";
import { FormulaElement } from "@feature-board-formula-element";
import { PollElement } from "@feature-board-poll-element";
import { RecordingElement } from "@feature-board-recording-element";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { Component } from "vue";

const askDeletionForType = vi.fn();
vi.mock("@/utils/confirmation-dialog.utils", () => ({
	askDeletionForType: (type: string) => askDeletionForType(type),
}));

vi.mock("@data-board", async (importOriginal) => {
	const original = await importOriginal<typeof import("@data-board")>();

	return {
		...original,
		useBoardFocusHandler: vi.fn(),
		useContentElementState: vi.fn(() => ({ modelValue: { value: {} }, computedElement: { value: {} } })),
		useCardStore: vi.fn(() => ({ voteInPollRequest: vi.fn(), setChecklistItemCheckedRequest: vi.fn() })),
	};
});

vi.mock("@data-file", () => ({
	useFileStorageApi: () => ({
		fetchFiles: vi.fn(),
		upload: vi.fn(),
		getFileRecordsByParentId: vi.fn(() => []),
		deleteFiles: vi.fn(),
	}),
}));

const timestamps = { createdAt: "2026-01-01T00:00:00Z", lastUpdatedAt: "2026-01-01T00:00:00Z" };

/**
 * Every element type has to offer a delete, and it has to name itself in the confirmation —
 * a dialog that asks about "boardElement" reads like a bug even when the delete works.
 */
const cases: { name: string; component: Component; element: object; expectedType: string }[] = [
	{
		name: "poll",
		component: PollElement,
		expectedType: "components.cardElement.pollElement",
		element: {
			id: "e1",
			type: ContentElementType.POLL,
			timestamps,
			content: {
				question: "",
				options: [],
				anonymous: false,
				multipleChoice: false,
				closed: false,
				showResults: "always",
				resultsReleased: false,
				resultsVisible: true,
				ownVote: [],
			},
		},
	},
	{
		name: "deadline",
		component: DeadlineElement,
		expectedType: "components.cardElement.deadlineElement",
		element: { id: "e2", type: ContentElementType.DEADLINE, timestamps, content: { title: "", dueDate: null, showInCalendar: false } },
	},
	{
		name: "code",
		component: CodeElement,
		expectedType: "components.cardElement.codeElement",
		element: {
			id: "e3",
			type: ContentElementType.CODE,
			timestamps,
			content: { code: "", language: "plaintext", showLineNumbers: false, syntaxHighlighting: true },
		},
	},
	{
		name: "formula",
		component: FormulaElement,
		expectedType: "components.cardElement.formulaElement",
		element: { id: "e4", type: ContentElementType.FORMULA, timestamps, content: { latex: "" } },
	},
	{
		name: "checklist",
		component: ChecklistElement,
		expectedType: "components.cardElement.checklistElement",
		element: {
			id: "e5",
			type: ContentElementType.CHECKLIST,
			timestamps,
			content: { title: "", items: [], progressMode: "shared", completedCount: 0 },
		},
	},
	{
		name: "recording",
		component: RecordingElement,
		expectedType: "components.cardElement.recordingElement",
		element: { id: "e6", type: ContentElementType.RECORDING, timestamps, content: { mediaType: "audio", caption: "" } },
	},
];

describe.each(cases)("$name element deletion", ({ component, element, expectedType }) => {
	const setup = (isEditMode = true) => {
		setActivePinia(createTestingPinia());

		const wrapper = mount(component, {
			attachTo: document.body,
			global: {
				plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
			},
			props: { element, isEditMode, columnIndex: 0, rowIndex: 0, elementIndex: 0 },
		});

		return { wrapper };
	};

	/**
	 * The menu is a VMenu, so its items only exist once it is open — and they render into an
	 * overlay outside the component, which is why this reaches for the document.
	 */
	const openMenu = async (wrapper: ReturnType<typeof setup>["wrapper"]) => {
		await wrapper.find("[data-testid^=element-menu-button-]").trigger("click");
		await flushPromises();

		return document.querySelector("[data-testid=kebab-menu-action-delete]");
	};

	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
		askDeletionForType.mockResolvedValue(true);
	});

	it("should offer a delete action while the card is being edited", async () => {
		const { wrapper } = setup();

		expect(await openMenu(wrapper)).not.toBeNull();
	});

	it("should ask about itself by name, not about a generic board element", async () => {
		const { wrapper } = setup();

		(await openMenu(wrapper))?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();

		expect(askDeletionForType).toHaveBeenCalledWith(expectedType);
	});

	it("should emit the deletion once it is confirmed", async () => {
		const { wrapper } = setup();

		(await openMenu(wrapper))?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();

		expect(wrapper.emitted("delete:element")).toBeTruthy();
	});

	it("should not delete anything when the confirmation is declined", async () => {
		askDeletionForType.mockResolvedValue(false);
		const { wrapper } = setup();

		(await openMenu(wrapper))?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();

		expect(wrapper.emitted("delete:element")).toBeFalsy();
	});

	it("should hide the menu while the card is not being edited", () => {
		const { wrapper } = setup(false);

		expect(wrapper.find("[data-testid^=element-menu-button-]").exists()).toBe(false);
	});
});
