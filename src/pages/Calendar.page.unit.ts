import CalendarPage from "./Calendar.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestAppStoreWithPermissions, createTestEnvStore, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { Permission } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("CalendarPage", () => {
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
	});

	const setup = (events: unknown[] = [], permissions: Permission[] = []) => {
		axiosMock.get.mockResolvedValue({ data: events });
		createTestAppStoreWithPermissions(permissions);

		const wrapper = mount(CalendarPage, {
			attachTo: document.body,
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					CalendarEventRow: {
						props: ["event", "dateLabel"],
						template: '<div data-testid="calendar-row">{{ event.title }}</div>',
					},
					CalendarEventForm: {
						props: ["modelValue", "event"],
						template: '<div v-if="modelValue" data-testid="calendar-form-stub">{{ event?.title ?? "new" }}</div>',
					},
				},
			},
		});

		return { wrapper };
	};

	it("renders the month grid like the legacy calendar", async () => {
		const { wrapper } = setup();
		await flushPromises();

		expect(wrapper.find("[data-testid='calendar-grid']").exists()).toBe(true);
		expect(wrapper.findAll("[data-testid^='calendar-day-']")).toHaveLength(42);
		expect(wrapper.find("[data-testid='calendar-event']").exists()).toBe(false);
	});

	it("switches to week and day view", async () => {
		const { wrapper } = setup();
		await flushPromises();

		await wrapper.get("[data-testid='calendar-view-week']").trigger("click");
		expect(wrapper.findAll("[data-testid^='calendar-day-']")).toHaveLength(7);
		await wrapper.get("[data-testid='calendar-view-day']").trigger("click");
		expect(wrapper.findAll("[data-testid^='calendar-day-']")).toHaveLength(1);
	});

	it("renders calendar events", async () => {
		const { wrapper } = setup([
			{
				_id: "event-1",
				title: "Team meeting",
				start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
				end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
			},
		]);
		await flushPromises();

		const event = wrapper.get("[data-testid='calendar-event']");
		expect(event.text()).toContain("Team meeting");
	});

	const ownEvent = (extra: Record<string, unknown> = {}) => ({
		_id: "event-1",
		title: "Handball",
		start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
		...extra,
	});
	const editRights = [Permission.CALENDAR_CREATE, Permission.CALENDAR_EDIT];
	const openEvent = async (wrapper: ReturnType<typeof setup>["wrapper"]) => {
		await flushPromises();
		await wrapper.get("[data-testid='calendar-event']").trigger("click");
		await flushPromises();
	};
	const inDialog = (testId: string) => document.querySelector<HTMLElement>(`[data-testid='${testId}']`);

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("offers to add a date only with the create permission", async () => {
		const { wrapper } = setup([], editRights);
		await flushPromises();

		await wrapper.get("[data-testid='calendar-add-event']").trigger("click");
		expect(wrapper.get("[data-testid='calendar-form-stub']").text()).toBe("new");

		const withoutRights = setup([], []);
		await flushPromises();
		expect(withoutRights.wrapper.find("[data-testid='calendar-add-event']").exists()).toBe(false);
	});

	it("edits an own date from its dialog", async () => {
		const { wrapper } = setup([ownEvent()], editRights);
		await openEvent(wrapper);

		inDialog("calendar-event-edit")?.click();
		await flushPromises();

		expect(wrapper.get("[data-testid='calendar-form-stub']").text()).toBe("Handball");
	});

	it("deletes an own date after confirmation and reloads", async () => {
		const { wrapper } = setup([ownEvent()], editRights);
		await openEvent(wrapper);

		inDialog("calendar-event-delete")?.click();
		await flushPromises();
		expect(axiosMock.delete).not.toHaveBeenCalled();
		expect(inDialog("calendar-event-confirm-delete")).not.toBeNull();

		inDialog("calendar-event-delete-confirm")?.click();
		await flushPromises();

		expect(axiosMock.delete).toHaveBeenCalledWith("/calendar/event-1");
		expect(axiosMock.get).toHaveBeenCalledTimes(2);
	});

	it("does not offer to change course dates", async () => {
		const { wrapper } = setup([ownEvent({ "x-sc-courseId": "course-1" })], editRights);
		await openEvent(wrapper);

		expect(inDialog("calendar-event-dialog")).not.toBeNull();
		expect(inDialog("calendar-event-edit")).toBeNull();
		expect(inDialog("calendar-event-delete")).toBeNull();
	});
});
