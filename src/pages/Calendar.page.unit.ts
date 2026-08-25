import CalendarPage from "./Calendar.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestEnvStore, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
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

	const setup = (events: unknown[] = []) => {
		axiosMock.get.mockResolvedValue({ data: events });

		const wrapper = mount(CalendarPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					CalendarEventRow: {
						props: ["event", "dateLabel"],
						template: '<div data-testid="calendar-row">{{ event.title }}</div>',
					},
				},
			},
		});

		return { wrapper };
	};

	it("renders an empty state", async () => {
		const { wrapper } = setup();
		await flushPromises();

		expect(wrapper.find("[data-testid='calendar-empty']").exists()).toBe(true);
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

		expect(wrapper.find("[data-testid='calendar-event-list']").exists()).toBe(true);
		expect(wrapper.text()).toContain("Team meeting");
	});
});
