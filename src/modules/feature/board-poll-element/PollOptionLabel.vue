<template>
	<div class="poll-option w-100">
		<div class="d-flex align-center ga-2">
			<span class="poll-option-text">{{ optionText }}</span>
			<VIcon v-if="ownVote" size="x-small" :icon="mdiCheck" data-testid="poll-own-vote-marker" />
			<VSpacer />
			<span v-if="resultsVisible" class="text-caption text-medium-emphasis poll-option-count">
				{{ t("components.cardElement.pollElement.votes", { count: option.count ?? 0 }) }}
			</span>
		</div>
		<VProgressLinear
			v-if="resultsVisible"
			:model-value="share"
			height="6"
			rounded
			class="mt-1"
			:aria-label="t('components.cardElement.pollElement.share', { percent: Math.round(share) })"
		/>
		<p v-if="voterNames" class="text-caption text-medium-emphasis mt-1 mb-0" data-testid="poll-option-voters">
			{{ voterNames }}
		</p>
	</div>
</template>

<script setup lang="ts">
import { PollOptionResponse } from "@api-server";
import { mdiCheck } from "@icons/material";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		option: PollOptionResponse;
		resultsVisible: boolean;
		total: number;
		ownVote?: boolean;
	}>(),
	{ ownVote: false }
);

const { t } = useI18n();

const optionText = computed(() => props.option.text || t("components.cardElement.pollElement.noOptionText"));

const share = computed(() => {
	if (!props.resultsVisible || props.total === 0) return 0;

	return ((props.option.count ?? 0) / props.total) * 100;
});

// Only an open poll ever carries voter ids; an anonymous one leaves the field empty.
const voterNames = computed(() => {
	const voterIds = props.option.voterIds;
	if (!voterIds || voterIds.length === 0) return undefined;

	return t("components.cardElement.pollElement.votedBy", { count: voterIds.length });
});
</script>

<style lang="scss" scoped>
.poll-option-text {
	font-size: var(--text-md);
	overflow-wrap: anywhere;
}
</style>
