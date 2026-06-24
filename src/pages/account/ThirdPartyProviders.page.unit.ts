import ThirdPartyProvidersPage from "./ThirdPartyProviders.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestEnvStore, mockApi, mockApiResponse, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { Oauth2ApiInterface } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("ThirdPartyProvidersPage", () => {
	let oauth2Api: Mocked<Oauth2ApiInterface>;
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
		oauth2Api = mockApi<Oauth2ApiInterface>();
		vi.spyOn(serverApi, "Oauth2ApiFactory").mockReturnValue(oauth2Api);
	});

	const setup = (sessions = [{ client_id: "client-1", client_name: "Client One", challenge: "challenge" }]) => {
		oauth2Api.oauthProviderControllerListConsentSessions.mockResolvedValue(mockApiResponse({ data: sessions }));
		oauth2Api.oauthProviderControllerRevokeConsentSession.mockResolvedValue(mockApiResponse({ data: undefined }));

		const wrapper = mount(ThirdPartyProvidersPage, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});

		return { wrapper };
	};

	it("renders sessions", async () => {
		const { wrapper } = setup();
		await flushPromises();

		expect(wrapper.find("[data-testid='third-party-providers-list']").exists()).toBe(true);
		expect(wrapper.text()).toContain("Client One");
	});

	it("renders empty state", async () => {
		const { wrapper } = setup([]);
		await flushPromises();

		expect(wrapper.find("[data-testid='third-party-providers-empty']").exists()).toBe(true);
	});
});
