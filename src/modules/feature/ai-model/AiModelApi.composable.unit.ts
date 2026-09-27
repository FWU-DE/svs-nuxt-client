import { AiModelListResponse, useAiModelApi } from "./AiModelApi.composable";
import { initializeAxios } from "@/utils/api";
import { mockAxiosInstance } from "@@/tests/test-utils";
import { logger } from "@util-logger";
import { AxiosInstance } from "axios";
import { Mocked } from "vitest";

vi.mock("@util-logger");

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

const setup = () => {
	const axios: Mocked<AxiosInstance> = mockAxiosInstance();
	initializeAxios(axios);

	return { axios, api: useAiModelApi() };
};

describe("AiModelApi Composable", () => {
	describe("load", () => {
		it("reads the models, the choice and the budget", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: listResponse() });

			await api.load();

			expect(axios.get).toHaveBeenCalledWith("/v3/ai-suggestion/models");
			expect(api.models.value).toEqual([flash, pro]);
			expect(api.selected.value).toBe(flash.id);
			expect(api.defaultModel.value).toBe(flash.id);
			expect(api.budget.value).toEqual({ limitEur: 10, spentEur: 0.42, windowHours: 24 });
			expect(api.isAvailable.value).toBe(true);
			expect(api.isLoading.value).toBe(false);
		});

		it("is not available when the server has no AI configured", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: { data: [], selected: null, defaultModel: null, budget: null } });

			await api.load();

			expect(api.isAvailable.value).toBe(false);
			expect(api.budget.value).toBeNull();
		});

		it("is not available when the request fails", async () => {
			const { axios, api } = setup();
			axios.get.mockRejectedValue(new Error("offline"));

			await api.load();

			expect(api.isAvailable.value).toBe(false);
			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe("select", () => {
		it("stores another model and takes over the answer", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: listResponse() });
			axios.put.mockResolvedValue({ data: listResponse({ selected: pro.id }) });
			await api.load();

			const isSaved = await api.select(pro.id);

			expect(axios.put).toHaveBeenCalledWith("/v3/ai-suggestion/models/selected", { model: pro.id });
			expect(isSaved).toBe(true);
			expect(api.selected.value).toBe(pro.id);
			expect(api.isSaving.value).toBe(false);
		});

		it("goes back to the default instead of pinning the default model", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: listResponse({ selected: pro.id }) });
			axios.put.mockResolvedValue({ data: listResponse() });
			await api.load();

			await api.select(flash.id);

			expect(axios.put).toHaveBeenCalledWith("/v3/ai-suggestion/models/selected", { model: null });
		});

		it("keeps the previous choice when the server refuses", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: listResponse() });
			axios.put.mockRejectedValue({ response: { status: 400 } });
			await api.load();

			const isSaved = await api.select("unknown/model");

			expect(isSaved).toBe(false);
			expect(api.selected.value).toBe(flash.id);
			expect(api.isSaving.value).toBe(false);
		});
	});
});
