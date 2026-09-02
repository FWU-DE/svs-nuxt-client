<template>
	<div class="poll-display">
		<p v-if="content.question" class="poll-question mb-2">{{ content.question }}</p>
		<p v-else class="poll-question poll-question--empty mb-2 text-medium-emphasis">
			{{ t("components.cardElement.pollElement.noQuestion") }}
		</p>

		<VRadioGroup
			v-if="canVote && !content.multipleChoice"
			:model-value="selection[0] ?? null"
			hide-details
			class="mt-0"
			@update:model-value="onSingleSelect"
		>
			<VRadio
				v-for="option in content.options"
				:key="option.id"
				:value="option.id"
				:data-testid="`poll-option-${option.id}`"
			>
				<template #label>
					<PollOptionLabel :option="option" :results-visible="content.resultsVisible" :total="totalVoters" />
				</template>
			</VRadio>
		</VRadioGroup>

		<div v-else-if="canVote">
			<VCheckbox
				v-for="option in content.options"
				:key="option.id"
				:model-value="selection.includes(option.id)"
				hide-details
				density="compact"
				:data-testid="`poll-option-${option.id}`"
				@update:model-value="onMultiSelect(option.id, $event)"
			>
				<template #label>
					<PollOptionLabel :option="option" :results-visible="content.resultsVisible" :total="totalVoters" />
				</template>
			</VCheckbox>
		</div>

		<ul v-else class="poll-result-list">
			<li v-for="option in content.options" :key="option.id" :data-testid="`poll-option-${option.id}`">
				<PollOptionLabel
					:option="option"
					:results-visible="content.resultsVisible"
					:total="totalVoters"
					:own-vote="content.ownVote.includes(option.id)"
				/>
			</li>
		</ul>

		<div class="d-flex align-center mt-2 ga-2 flex-wrap">
			<VChip v-if="content.closed" size="small" variant="tonal" data-testid="poll-closed-chip">
				{{ t("components.cardElement.pollElement.closed") }}
			</VChip>
			<VChip v-if="content.anonymous" size="small" variant="tonal" data-testid="poll-anonymous-chip">
				{{ t("components.cardElement.pollElement.anonymous") }}
			</VChip>
			<span v-if="content.resultsVisible" class="text-caption text-medium-emphasis" data-testid="poll-voter-count">
				{{ t("components.cardElement.pollElement.voterCount", { count: totalVoters }) }}
			</span>
			<span v-else class="text-caption text-medium-emphasis" data-testid="poll-results-hidden">
				{{ resultsHiddenHint }}
			</span>
			<VSpacer />
			<VBtn
				v-if="canVote && content.ownVote.length > 0"
				size="small"
				variant="text"
				data-testid="poll-withdraw-vote"
				@click="onWithdraw"
			>
				{{ t("components.cardElement.pollElement.withdraw") }}
			</VBtn>
		</div>
	</div>
</template>

<script setup lang="ts">
import PollOptionLabel from "./PollOptionLabel.vue";
import { PollElementContent, PollResultVisibility } from "@api-server";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	content: PollElementContent;
}>();

const emit = defineEmits<{
	(e: "vote", optionIds: string[]): void;
}>();

const { t } = useI18n();

const content = computed(() => props.content);
const canVote = computed(() => !content.value.closed);
const totalVoters = computed(() => content.value.voterCount ?? 0);

// Mirrors the server's ownVote so a click feels immediate; the server answer overwrites it.
// Seeded by the watcher rather than from props in root scope, so the mirror cannot start out
// holding a stale copy of a prop that changed before the component finished setting up.
const selection = ref<string[]>([]);
watch(
	() => props.content.ownVote,
	(ownVote) => {
		selection.value = [...ownVote];
	},
	{ immediate: true }
);

const resultsHiddenHint = computed(() =>
	content.value.showResults === PollResultVisibility.AFTER_VOTE
		? t("components.cardElement.pollElement.resultsAfterVote")
		: t("components.cardElement.pollElement.resultsAfterClose")
);

const onSingleSelect = (optionId: string | null) => {
	const optionIds = optionId ? [optionId] : [];
	selection.value = optionIds;
	emit("vote", optionIds);
};

const onMultiSelect = (optionId: string, checked: boolean | null) => {
	const optionIds = checked ? [...selection.value, optionId] : selection.value.filter((id) => id !== optionId);
	selection.value = optionIds;
	emit("vote", optionIds);
};

const onWithdraw = () => {
	selection.value = [];
	emit("vote", []);
};
</script>

<style lang="scss" scoped>
.poll-question {
	font-weight: 600;
	font-size: var(--text-md);
}

.poll-question--empty {
	font-weight: 400;
	font-style: italic;
}

.poll-result-list {
	list-style: none;
	padding: 0;
	margin: 0;

	li + li {
		margin-top: 8px;
	}
}
</style>
