import HelpArticlesPage from "./HelpArticles.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("HelpArticlesPage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
	});

	const setup = () =>
		mount(HelpArticlesPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

	it("renders help topics and quick links", async () => {
		const wrapper = setup();
		await flushPromises();

		expect(wrapper.find("[data-testid='help-articles-title']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='help-quick-links']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='help-topic-list']").exists()).toBe(true);
		expect(wrapper.text()).toContain("Unterricht");
	});

	it("filters articles by search query", async () => {
		const wrapper = setup();
		await flushPromises();

		await wrapper.get("[data-testid='help-search'] input").setValue("Videokonferenzen");
		await flushPromises();

		expect(wrapper.text()).toContain("Videokonferenzen");
		expect(wrapper.text()).not.toContain("Passwörter zurücksetzen");
	});
});
