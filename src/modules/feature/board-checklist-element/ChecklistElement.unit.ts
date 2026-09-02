import ChecklistElement from "./ChecklistElement.vue";
import de from "@/locales/de";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ChecklistElementResponse, ChecklistProgressMode, ContentElementType } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

const updateElementRequest = vi.fn();
const setChecklistItemCheckedRequest = vi.fn();

vi.mock("@data-board", async (importOriginal) => {
	const original = await importOriginal<typeof import("@data-board")>();

	return {
		...original,
		useBoardFocusHandler: vi.fn(),
		useCardStore: vi.fn(() => ({ updateElementRequest, setChecklistItemCheckedRequest })),
	};
});

const buildElement = (items: ChecklistElementResponse["content"]["items"] = []): ChecklistElementResponse => ({
	id: "checklist-1",
	type: ContentElementType.CHECKLIST,
	timestamps: { createdAt: "2026-01-01T00:00:00Z", lastUpdatedAt: "2026-01-01T00:00:00Z" },
	content: {
		title: "Schritte",
		progressMode: ChecklistProgressMode.SHARED,
		// The server reports the progress; one of the two default items is ticked.
		completedCount: 1,
		items: items.length
			? items
			: [
					{ id: "item-1", text: "Erster Schritt", checked: false },
					{ id: "item-2", text: "Zweiter Schritt", checked: true },
				],
	},
});

const setup = (options: { isEditMode?: boolean; element?: ChecklistElementResponse } = {}) => {
	setActivePinia(createTestingPinia());

	const wrapper = mount(ChecklistElement, {
		global: {
			plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
		},
		props: {
			element: options.element ?? buildElement(),
			isEditMode: options.isEditMode ?? false,
			columnIndex: 0,
			rowIndex: 0,
			elementIndex: 0,
		},
	});

	return { wrapper };
};

describe("ChecklistElement", () => {
	beforeEach(() => {
		updateElementRequest.mockClear();
		setChecklistItemCheckedRequest.mockClear();
	});

	describe("when a participant reads the list", () => {
		it("should render every item", () => {
			const { wrapper } = setup();

			expect(wrapper.text()).toContain("Erster Schritt");
			expect(wrapper.text()).toContain("Zweiter Schritt");
		});

		it("should show the shared progress the server reported", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid=checklist-progress]").text()).toContain("1 von 2");
		});

		it("should not show the personal hint for a shared list", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid=checklist-personal-hint]").exists()).toBe(false);
		});

		it("should send a tick without going through the element update", async () => {
			const { wrapper } = setup();

			await wrapper.find("[data-testid=checklist-item-item-1] input").setValue(true);

			expect(setChecklistItemCheckedRequest).toHaveBeenCalledWith({
				elementId: "checklist-1",
				itemId: "item-1",
				checked: true,
			});
			expect(updateElementRequest).not.toHaveBeenCalled();
		});
	});

	describe("when the list is personal", () => {
		const personal = (extra: Partial<ChecklistElementResponse["content"]> = {}) => {
			const element = buildElement();

			return {
				...element,
				content: { ...element.content, progressMode: ChecklistProgressMode.PER_USER, ...extra },
			};
		};

		it("should say that the ticks are only the reader's own", () => {
			const { wrapper } = setup({ element: personal() });

			expect(wrapper.find("[data-testid=checklist-personal-hint]").exists()).toBe(true);
		});

		it("should show how many people started once the server reports it", () => {
			const { wrapper } = setup({ element: personal({ participantCount: 4 }) });

			expect(wrapper.find("[data-testid=checklist-participants]").text()).toContain("4");
		});

		it("should not show a participant count to someone who is not given one", () => {
			const { wrapper } = setup({ element: personal() });

			expect(wrapper.find("[data-testid=checklist-participants]").exists()).toBe(false);
		});
	});

	describe("when a teacher edits the list", () => {
		it("should persist an edited item text", async () => {
			const { wrapper } = setup({ isEditMode: true });

			await wrapper.find("[data-testid=checklist-item-input-0] input").setValue("Erster Schritt, korrigiert");
			await flushPromises();
			await vi.waitFor(() => expect(updateElementRequest).toHaveBeenCalled());

			const [{ element }] = updateElementRequest.mock.calls.at(-1) as [{ element: ChecklistElementResponse }];
			expect(element.content.items[0].text).toBe("Erster Schritt, korrigiert");
		});

		it("should send a new item without an id, so the server mints one", async () => {
			const { wrapper } = setup({ isEditMode: true });

			await wrapper.find("[data-testid=checklist-add-item]").trigger("click");
			await flushPromises();
			await vi.waitFor(() => expect(updateElementRequest).toHaveBeenCalled());

			const [{ element }] = updateElementRequest.mock.calls.at(-1) as [{ element: ChecklistElementResponse }];
			expect(element.content.items.at(-1)).toEqual({ text: "" });
		});

		it("should not send the checked state back as if it were a setting", async () => {
			const { wrapper } = setup({ isEditMode: true });

			await wrapper.find("[data-testid=checklist-item-input-0] input").setValue("Geändert");
			await flushPromises();
			await vi.waitFor(() => expect(updateElementRequest).toHaveBeenCalled());

			const [{ element }] = updateElementRequest.mock.calls.at(-1) as [{ element: ChecklistElementResponse }];
			expect(element.content.items.every((item) => !("checked" in item))).toBe(true);
		});
	});
});
