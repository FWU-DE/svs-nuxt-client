<template>
	<div class="poll-edit">
		<VTextField
			:model-value="modelValue.question"
			:label="t('components.cardElement.pollElement.question')"
			density="compact"
			variant="outlined"
			maxlength="500"
			data-testid="poll-question-input"
			@update:model-value="onQuestionChange"
		/>

		<VAlert
			v-if="showVoteResetHint"
			type="info"
			variant="tonal"
			density="compact"
			class="mb-3"
			data-testid="poll-reset-hint"
		>
			{{ t("components.cardElement.pollElement.voteResetHint") }}
		</VAlert>

		<div v-for="(option, index) in modelValue.options" :key="option.id ?? `new-${index}`" class="d-flex ga-2">
			<VTextField
				:model-value="option.text"
				:label="t('components.cardElement.pollElement.option', { index: index + 1 })"
				density="compact"
				variant="outlined"
				maxlength="200"
				:data-testid="`poll-option-input-${index}`"
				@update:model-value="onOptionChange(index, $event)"
			/>
			<VBtn
				:icon="mdiTrashCanOutline"
				variant="text"
				size="small"
				class="mt-1"
				:disabled="modelValue.options.length <= 2"
				:aria-label="t('components.cardElement.pollElement.removeOption', { index: index + 1 })"
				:data-testid="`poll-remove-option-${index}`"
				@click="onRemoveOption(index)"
			/>
		</div>

		<VBtn
			variant="text"
			size="small"
			:prepend-icon="mdiPlus"
			:disabled="modelValue.options.length >= 20"
			data-testid="poll-add-option"
			@click="onAddOption"
		>
			{{ t("components.cardElement.pollElement.addOption") }}
		</VBtn>

		<VDivider class="my-3" />

		<VSelect
			:model-value="modelValue.showResults"
			:items="showResultsItems"
			:label="t('components.cardElement.pollElement.showResults')"
			density="compact"
			variant="outlined"
			hide-details
			class="mb-3"
			data-testid="poll-show-results-select"
			@update:model-value="onShowResultsChange"
		/>

		<VBtn
			v-if="modelValue.showResults === PollResultVisibility.ON_RELEASE"
			:variant="modelValue.resultsReleased ? 'tonal' : 'outlined'"
			size="small"
			class="mb-3"
			data-testid="poll-release-results"
			@click="onToggleRelease"
		>
			{{
				modelValue.resultsReleased
					? t("components.cardElement.pollElement.resultsWithdraw")
					: t("components.cardElement.pollElement.resultsRelease")
			}}
		</VBtn>

		<VSwitch
			:model-value="modelValue.multipleChoice"
			:label="t('components.cardElement.pollElement.multipleChoice')"
			density="compact"
			hide-details
			color="primary"
			data-testid="poll-multiple-choice-switch"
			@update:model-value="onMultipleChoiceChange"
		/>
		<VSwitch
			:model-value="modelValue.anonymous"
			:label="t('components.cardElement.pollElement.anonymous')"
			density="compact"
			hide-details
			color="primary"
			data-testid="poll-anonymous-switch"
			@update:model-value="onAnonymousChange"
		/>
		<VSwitch
			:model-value="modelValue.closed"
			:label="t('components.cardElement.pollElement.close')"
			density="compact"
			hide-details
			color="primary"
			data-testid="poll-closed-switch"
			@update:model-value="onClosedChange"
		/>
	</div>
</template>

<script setup lang="ts">
import { PollContentBody, PollResultVisibility } from "@api-server";
import { mdiPlus, mdiTrashCanOutline } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const modelValue = defineModel<PollContentBody>({ required: true });

const props = defineProps<{
	hasVotes: boolean;
}>();

const { t } = useI18n();

const showResultsItems = computed(() => [
	{ value: PollResultVisibility.ALWAYS, title: t("components.cardElement.pollElement.showResults.always") },
	{ value: PollResultVisibility.AFTER_VOTE, title: t("components.cardElement.pollElement.showResults.afterVote") },
	{ value: PollResultVisibility.ON_RELEASE, title: t("components.cardElement.pollElement.showResults.onRelease") },
]);

// Adding, removing or anonymising options invalidates the ballots already cast — the server
// clears them. Say so before the change lands rather than after.
const structureTouched = ref(false);
const showVoteResetHint = computed(() => props.hasVotes && structureTouched.value);

const onQuestionChange = (question: string) => {
	modelValue.value = { ...modelValue.value, question };
};

const onOptionChange = (index: number, text: string) => {
	const options = modelValue.value.options.map((option, i) => (i === index ? { ...option, text } : option));
	modelValue.value = { ...modelValue.value, options };
};

const onAddOption = () => {
	structureTouched.value = true;
	modelValue.value = { ...modelValue.value, options: [...modelValue.value.options, { text: "" }] };
};

const onRemoveOption = (index: number) => {
	structureTouched.value = true;
	const options = modelValue.value.options.filter((_, i) => i !== index);
	modelValue.value = { ...modelValue.value, options };
};

const onShowResultsChange = (showResults: PollResultVisibility) => {
	modelValue.value = { ...modelValue.value, showResults };
};

const onToggleRelease = () => {
	modelValue.value = { ...modelValue.value, resultsReleased: !modelValue.value.resultsReleased };
};

const onMultipleChoiceChange = (multipleChoice: boolean | null) => {
	modelValue.value = { ...modelValue.value, multipleChoice: multipleChoice ?? false };
};

const onAnonymousChange = (anonymous: boolean | null) => {
	structureTouched.value = true;
	modelValue.value = { ...modelValue.value, anonymous: anonymous ?? false };
};

const onClosedChange = (closed: boolean | null) => {
	modelValue.value = { ...modelValue.value, closed: closed ?? false };
};
</script>
