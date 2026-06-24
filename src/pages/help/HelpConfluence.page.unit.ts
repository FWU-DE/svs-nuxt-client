import HelpConfluencePage from "./HelpConfluence.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

describe("HelpConfluencePage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
	});

	it("renders an embedded confluence article", async () => {
		const router = createRouter({
			history: createWebHistory(),
			routes: [{ path: "/help/confluence/:id", component: HelpConfluencePage }],
		});
		await router.push("/help/confluence/12345");
		await router.isReady();

		const wrapper = mount(HelpConfluencePage, {
			global: {
				plugins: [router, createTestingVuetify(), createTestingI18n()],
			},
		});

		const frame = wrapper.get("[data-testid='help-confluence-frame']");
		expect(frame.attributes("src")).toBe(
			"https://docs.dbildungscloud.de/pages/viewpage.action?pageId=12345&frameable=true"
		);
		expect(wrapper.get("[data-testid='help-confluence-open']").attributes("href")).toBe(
			"https://docs.dbildungscloud.de/pages/viewpage.action?pageId=12345"
		);
	});
});
