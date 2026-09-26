import CalendarEventForm from "./CalendarEventForm.vue";
import { initializeAxios } from "@/utils/api";
import { createTestAppStoreWithUser, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { DashboardCalendarEvent } from "@data-access";
import { notifyError } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	notifyError: vi.fn(),
}));

describe("CalendarEventForm", () => {
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestAppStoreWithUser("user-1");
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	const setup = (event?: DashboardCalendarEvent) =>
		mount(CalendarEventForm, {
			attachTo: document.body,
			props: { modelValue: true, event },
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

	const input = (testId: string) =>
		document.querySelector<HTMLInputElement>(`[data-testid='${testId}'] input, [data-testid='${testId}'] textarea`)!;
	const fill = async (testId: string, value: string) => {
		const element = input(testId);
		element.value = value;
		element.dispatchEvent(new Event("input"));
		await flushPromises();
	};
	const save = async () => {
		document.querySelector<HTMLElement>("[data-testid='calendar-form-save']")!.click();
		await flushPromises();
	};

	it("creates a personal date in the user's scope", async () => {
		const wrapper = setup();
		await fill("calendar-form-title", " Handball ");
		await fill("calendar-form-start", "2026-10-01T18:00");
		await fill("calendar-form-end", "2026-10-01T19:30");
		await fill("calendar-form-location", "Turnhalle");
		await save();

		expect(axiosMock.post).toHaveBeenCalledWith("/calendar", {
			summary: "Handball",
			startDate: new Date("2026-10-01T18:00").toISOString(),
			endDate: new Date("2026-10-01T19:30").toISOString(),
			description: "",
			location: "Turnhalle",
			scopeId: "user-1",
		});
		expect(wrapper.emitted("saved")).toHaveLength(1);
		expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
	});

	it("fills in and updates an existing date", async () => {
		setup({
			id: "event-1",
			title: "Elternabend",
			startsAt: new Date("2026-10-02T17:00"),
			endsAt: new Date("2026-10-02T19:00"),
			location: "Aula",
		} as DashboardCalendarEvent);
		expect(input("calendar-form-title").value).toBe("Elternabend");
		expect(input("calendar-form-start").value).toBe("2026-10-02T17:00");

		await fill("calendar-form-title", "Elternabend 5b");
		await save();

		expect(axiosMock.put).toHaveBeenCalledWith(
			"/calendar/event-1",
			expect.objectContaining({ summary: "Elternabend 5b", location: "Aula", scopeId: "user-1" })
		);
	});

	it("refuses an end before the start", async () => {
		setup();
		await fill("calendar-form-title", "Falsch herum");
		await fill("calendar-form-start", "2026-10-01T18:00");
		await fill("calendar-form-end", "2026-10-01T17:00");
		await save();

		expect(axiosMock.post).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain("pages.calendar.form.endBeforeStart");
	});

	it("reports a failed save", async () => {
		axiosMock.post.mockRejectedValue(new Error("down"));
		const wrapper = setup();
		await fill("calendar-form-title", "Handball");
		await save();

		expect(notifyError).toHaveBeenCalledWith("pages.calendar.form.error");
		expect(wrapper.emitted("saved")).toBeUndefined();
	});
});
