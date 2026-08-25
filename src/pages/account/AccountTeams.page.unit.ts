import AccountTeamsPage from "./AccountTeams.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("AccountTeamsPage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
	});

	it("renders the native team visibility page", () => {
		const wrapper = mount(AccountTeamsPage, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

		expect(wrapper.find("[data-testid='account-teams-title']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='account-teams-native-note']").exists()).toBe(true);
	});
});
