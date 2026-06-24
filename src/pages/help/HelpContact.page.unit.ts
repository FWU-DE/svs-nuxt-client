import HelpContactPage from "./HelpContact.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestEnvStore, mockApi, mockApiResponse, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { HelpdeskApiInterface } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("HelpContactPage", () => {
	let helpdeskApi: Mocked<HelpdeskApiInterface>;
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
		helpdeskApi = mockApi<HelpdeskApiInterface>();
		vi.spyOn(serverApi, "HelpdeskApiFactory").mockReturnValue(helpdeskApi);
		helpdeskApi.helpdeskControllerCreateProblem.mockResolvedValue(mockApiResponse({ data: undefined }));
		helpdeskApi.helpdeskControllerCreateWish.mockResolvedValue(mockApiResponse({ data: undefined }));
	});

	const setup = () =>
		mount(HelpContactPage, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

	it("renders problem form", () => {
		const wrapper = setup();

		expect(wrapper.find("[data-testid='help-contact-title']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='help-contact-problem-description']").exists()).toBe(true);
	});

	it("submits a problem", async () => {
		const wrapper = setup();

		await wrapper.get("[data-testid='help-contact-problem-area'] input").setValue("Aufgaben");
		await wrapper.get("[data-testid='help-contact-subject'] input").setValue("Problem");
		await wrapper.get("[data-testid='help-contact-problem-description'] textarea").setValue("Details");
		await wrapper.get("[data-testid='help-contact-email'] input").setValue("test@example.com");
		await wrapper.get("[data-testid='help-contact-form']").trigger("submit");
		await flushPromises();

		expect(helpdeskApi.helpdeskControllerCreateProblem).toHaveBeenCalled();
	});
});
