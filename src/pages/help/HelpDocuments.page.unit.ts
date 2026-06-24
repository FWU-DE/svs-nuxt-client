import HelpDocumentsPage from "./HelpDocuments.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestEnvStore, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { SchulcloudTheme } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("HelpDocumentsPage", () => {
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud", SC_THEME: SchulcloudTheme.DEFAULT });
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
	});

	const setup = (sections = [{ title: "Section", content: "<p>Document</p>" }]) => {
		axiosMock.get.mockResolvedValue({ data: sections });
		const wrapper = mount(HelpDocumentsPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: ["RenderHTML"],
			},
		});
		return { wrapper };
	};

	it("renders help document sections", async () => {
		const { wrapper } = setup();
		await flushPromises();

		expect(axiosMock.get).toHaveBeenCalledWith("/help/documents", { params: { theme: SchulcloudTheme.DEFAULT } });
		expect(wrapper.find("[data-testid='help-documents-list']").exists()).toBe(true);
		expect(wrapper.text()).toContain("Section");
	});

	it("renders empty state", async () => {
		const { wrapper } = setup([]);
		await flushPromises();

		expect(wrapper.find("[data-testid='help-documents-empty']").exists()).toBe(true);
	});
});
