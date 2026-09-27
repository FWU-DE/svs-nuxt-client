<template>
	<section v-if="isShown" class="mt-8" data-testid="ai-model-settings">
		<h2>{{ t("pages.accountSettings.aiModel.title") }}</h2>
		<p class="text-medium-emphasis mb-4">{{ t("pages.accountSettings.aiModel.description") }}</p>

		<label for="account-ai-model" class="d-block font-weight-bold mb-2">
			{{ t("pages.accountSettings.aiModel.label") }}
		</label>
		<VSelect
			id="account-ai-model"
			:model-value="currentModel"
			:items="items"
			item-title="title"
			item-value="value"
			item-props="props"
			variant="outlined"
			density="comfortable"
			:hint="currentPriceHint"
			persistent-hint
			:loading="isSaving"
			:disabled="isSaving"
			data-testid="account-ai-model"
			@update:model-value="onSelect"
		/>

		<p v-if="budget" class="mt-4" data-testid="account-ai-budget">
			{{
				t("pages.accountSettings.aiModel.budget", {
					spent: formatEur(budget.spentEur),
					limit: formatEur(budget.limitEur),
					hours: budget.windowHours,
				})
			}}
		</p>
	</section>
</template>

<script setup lang="ts">
import { AiModel, useAiModelApi } from "./AiModelApi.composable";
import { notifyError, notifySuccess } from "@data-app";
import { useEnvConfig } from "@data-env";
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const { models, selected, defaultModel, budget, isAvailable, isSaving, load, select } = useAiModelApi();

const isAiEnabled = computed(
	() => useEnvConfig().value.FEATURE_ROOM_AI_TEMPLATE_ENABLED || useEnvConfig().value.FEATURE_BOARD_AI_CARDS_ENABLED
);
const isShown = computed(() => isAiEnabled.value && isAvailable.value);

const currentModel = computed(() => selected.value ?? defaultModel.value);

const formatEur = (value: number) =>
	new Intl.NumberFormat(locale.value, {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
		maximumFractionDigits: 3,
	}).format(value);

const priceHint = (model: AiModel) =>
	t("pages.accountSettings.aiModel.price", {
		input: formatEur(model.inputEurPerMillionTokens),
		output: formatEur(model.outputEurPerMillionTokens),
	});

const items = computed(() =>
	models.value.map((model) => ({
		title:
			model.id === defaultModel.value
				? t("pages.accountSettings.aiModel.defaultModel", { label: model.label })
				: model.label,
		value: model.id,
		props: { subtitle: priceHint(model) },
	}))
);

const currentPriceHint = computed(() => {
	const model = models.value.find((entry) => entry.id === currentModel.value);
	return model ? priceHint(model) : undefined;
});

const onSelect = async (modelId: string | null) => {
	if (modelId === currentModel.value) return;

	const isSaved = await select(modelId);
	if (isSaved) {
		notifySuccess(t("pages.accountSettings.aiModel.saved"));
	} else {
		notifyError(t("pages.accountSettings.aiModel.saveError"));
	}
};

onMounted(() => {
	// without the feature the server is not asked at all
	if (isAiEnabled.value) load();
});
</script>
