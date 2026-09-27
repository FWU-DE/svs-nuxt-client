import { AiModelListResponse } from "./AiModelApi.composable";
import AiModelSettings from "./AiModelSettings.vue";
import de from "@/locales/de";
import { initializeAxios } from "@/utils/api";
import { createTestEnvStore, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ConfigResponse } from "@api-server";
import { notifyError, notifySuccess } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";
import { VSelect } from "vuetify/components";

vi.mock("@util-logger");
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	notifySuccess: vi.fn(),
	notifyError: vi.fn(),
}));

const flash = {
	id: "google/gemini-2.5-flash",
	label: "Gemini 2.5 Flash",
	inputEurPerMillionTokens: 0.3,
	outputEurPerMillionTokens: 2.5,
};
const pro = {
	id: "google/gemini-2.5-pro",
	label: "Gemini 2.5 Pro",
	inputEurPerMillionTokens: 1.25,
	outputEurPerMillionTokens: 10,
};

const listResponse = (overrides: Partial<AiModelListResponse> = {}): AiModelListResponse => ({
	data: [flash, pro],
	selected: flash.id,
	defaultModel: flash.id,
	budget: { limitEur: 10, spentEur: 0.42, windowHours: 24 },
	...overrides,
});

const setup = async (options: { env?: Partial<ConfigResponse>; response?: AiModelListResponse } = {}) => {
	setActivePinia(createTestingPinia({ stubActions: false }));
	createTestEnvStore({ FEATURE_BOARD_AI_CARDS_ENABLED: true, ...options.env });
	const axios: Mocked<AxiosInstance> = mockAxiosInstance();
	axios.get.mockResolvedValue({ data: options.response ?? listResponse() });
	initializeAxios(axios);

	const wrapper = mount(AiModelSettings, {
		global: {
			plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
		},
	});
	await flushPromises();

	return { axios, wrapper };
};

// Intl puts a no-break space between amount and currency sign
describe("AiModelSettings", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("when AI is available", () => {
		it("offers the models with their price and marks the default", async () => {
			const { wrapper } = await setup();

			const select = wrapper.getComponent(VSelect);
			expect(select.props("modelValue")).toBe(flash.id);
			expect(select.props("items")).toEqual([
				{
					title: "Gemini 2.5 Flash (Standard)",
					value: flash.id,
					props: { subtitle: "≈ 0,30\u00a0€ / 2,50\u00a0€ pro Mio. Tokens (Eingabe/Ausgabe)" },
				},
				{
					title: "Gemini 2.5 Pro",
					value: pro.id,
					props: { subtitle: "≈ 1,25\u00a0€ / 10\u00a0€ pro Mio. Tokens (Eingabe/Ausgabe)" },
				},
			]);
			expect(select.props("hint")).toBe("≈ 0,30\u00a0€ / 2,50\u00a0€ pro Mio. Tokens (Eingabe/Ausgabe)");
		});

		it("shows the shared budget", async () => {
			const { wrapper } = await setup();

			expect(wrapper.get("[data-testid='account-ai-budget']").text()).toBe(
				"Heute verbraucht: 0,42\u00a0€ von 10\u00a0€ (gilt für alle, rollierend 24 h)"
			);
		});

		it("stores a changed model and says so", async () => {
			const { axios, wrapper } = await setup();
			axios.put.mockResolvedValue({ data: listResponse({ selected: pro.id }) });

			wrapper.getComponent(VSelect).vm.$emit("update:modelValue", pro.id);
			await flushPromises();

			expect(axios.put).toHaveBeenCalledWith("/v3/ai-suggestion/models/selected", { model: pro.id });
			expect(notifySuccess).toHaveBeenCalled();
			expect(wrapper.getComponent(VSelect).props("modelValue")).toBe(pro.id);
		});

		it("reports a refused model and keeps the previous one", async () => {
			const { axios, wrapper } = await setup();
			axios.put.mockRejectedValue({ response: { status: 400 } });

			wrapper.getComponent(VSelect).vm.$emit("update:modelValue", pro.id);
			await flushPromises();

			expect(notifyError).toHaveBeenCalled();
			expect(wrapper.getComponent(VSelect).props("modelValue")).toBe(flash.id);
		});
	});

	describe("when the server offers no model", () => {
		it("does not show the section", async () => {
			const { wrapper } = await setup({
				response: { data: [], selected: null, defaultModel: null, budget: null },
			});

			expect(wrapper.find("[data-testid='ai-model-settings']").exists()).toBe(false);
		});
	});

	describe("when no AI feature is switched on", () => {
		it("neither asks the server nor shows the section", async () => {
			const { axios, wrapper } = await setup({
				env: { FEATURE_BOARD_AI_CARDS_ENABLED: false, FEATURE_ROOM_AI_TEMPLATE_ENABLED: false },
			});

			expect(axios.get).not.toHaveBeenCalled();
			expect(wrapper.find("[data-testid='ai-model-settings']").exists()).toBe(false);
		});
	});
});
