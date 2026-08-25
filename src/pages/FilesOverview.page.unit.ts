import FilesOverviewPage from "./FilesOverview.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("FilesOverviewPage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
	});

	const setup = () =>
		mount(FilesOverviewPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

	it("renders file area entry cards", () => {
		const wrapper = setup();

		expect(wrapper.find("[data-testid='files-overview-title']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='files-overview-personal']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='files-overview-courses']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='files-overview-shared']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='files-overview-search']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='files-overview-note']").exists()).toBe(true);
	});
});
