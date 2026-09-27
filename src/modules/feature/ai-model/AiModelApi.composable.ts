import { $axios } from "@/utils/api";
import { logger } from "@util-logger";
import { computed, ref } from "vue";

export type AiModel = {
	id: string;
	label: string;
	inputEurPerMillionTokens: number;
	outputEurPerMillionTokens: number;
};

export type AiBudget = {
	limitEur: number;
	spentEur: number;
	windowHours: number;
};

export type AiModelListResponse = {
	data: AiModel[];
	selected: string | null;
	defaultModel: string | null;
	budget: AiBudget | null;
};

const MODELS_URL = "/v3/ai-suggestion/models";

/**
 * Reads the models the server offers for AI suggestions and stores the one the user picked.
 *
 * The endpoint is not part of the generated client yet, so it is called by hand like the other
 * endpoints that only the SVS server knows.
 */
export const useAiModelApi = () => {
	const models = ref<AiModel[]>([]);
	const selected = ref<string | null>(null);
	const defaultModel = ref<string | null>(null);
	const budget = ref<AiBudget | null>(null);
	const isLoading = ref(false);
	const isSaving = ref(false);

	const isAvailable = computed(() => models.value.length > 0);

	const apply = (response: AiModelListResponse) => {
		models.value = response.data ?? [];
		selected.value = response.selected ?? null;
		defaultModel.value = response.defaultModel ?? null;
		budget.value = response.budget ?? null;
	};

	const load = async (): Promise<void> => {
		isLoading.value = true;
		try {
			const { data } = await $axios.get<AiModelListResponse>(MODELS_URL);
			apply(data);
		} catch (error) {
			// without an answer the settings simply do not offer a choice
			apply({ data: [], selected: null, defaultModel: null, budget: null });
			logger.error("Could not load the AI models", error);
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Picking the default model stores no choice at all, so the user keeps following the default
	 * when it changes later.
	 * @returns whether the server accepted the choice
	 */
	const select = async (modelId: string | null): Promise<boolean> => {
		const model = modelId === defaultModel.value ? null : modelId;

		isSaving.value = true;
		try {
			const { data } = await $axios.put<AiModelListResponse>(`${MODELS_URL}/selected`, { model });
			apply(data);
			return true;
		} catch (error) {
			logger.error("Could not store the AI model", error);
			return false;
		} finally {
			isSaving.value = false;
		}
	};

	return { models, selected, defaultModel, budget, isAvailable, isLoading, isSaving, load, select };
};
