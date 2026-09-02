<template>
	<SvsDialog v-model="isOpen" no-confirm title="components.boardCard.settings.title" data-testid="card-settings-dialog">
		<template #content>
			<p class="text-body-2 text-medium-emphasis mb-4">
				{{ t("components.boardCard.settings.description") }}
			</p>

			<VSelect
				:model-value="String(commentsEnabled)"
				:items="options(t('components.board.comments.toggle'))"
				:label="t('components.board.comments.title')"
				density="compact"
				variant="outlined"
				class="mb-3"
				hide-details
				data-testid="card-settings-comments"
				@update:model-value="onChange('commentsEnabled', $event)"
			/>

			<VSelect
				:model-value="reactionType ?? 'null'"
				:items="reactionOptions"
				:label="t('components.board.reactionType.title')"
				density="compact"
				variant="outlined"
				class="mb-3"
				hide-details
				data-testid="card-settings-reactions"
				@update:model-value="onReactionChange"
			/>

			<VSelect
				:model-value="String(readersCanEdit)"
				:items="options(t('components.boardCard.settings.readersCanEdit'))"
				:label="t('components.boardCard.settings.editing')"
				density="compact"
				variant="outlined"
				hide-details
				data-testid="card-settings-editing"
				@update:model-value="onChange('readersCanEdit', $event)"
			/>
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import { CardReactionType } from "@api-server";
import { SvsDialog } from "@ui-dialog";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const isOpen = defineModel({ type: Boolean, required: true });

defineProps({
	commentsEnabled: { type: [Boolean, null] as PropType<boolean | null>, default: null },
	readersCanEdit: { type: [Boolean, null] as PropType<boolean | null>, default: null },
	reactionType: { type: String as PropType<CardReactionType | null>, default: null },
});

const emit = defineEmits<{
	(e: "change", field: "commentsEnabled" | "readersCanEdit", value: boolean | null): void;
	(e: "change-reactions", value: CardReactionType | null): void;
}>();

const { t } = useI18n();

/**
 * Three states, not two: "follows the board" has to stay distinguishable from "off here", or a
 * card could never be handed back to the board setting.
 */
const options = (onLabel: string) => [
	{ value: "null", title: t("components.boardCard.settings.inherit") },
	{ value: "true", title: onLabel },
	{ value: "false", title: t("components.boardCard.settings.off") },
];

const reactionOptions = computed(() => [
	{ value: "null", title: t("components.boardCard.settings.inherit") },
	{ value: CardReactionType.NONE, title: t("components.board.reactionType.none") },
	{ value: CardReactionType.LIKE, title: t("components.board.reactionType.like") },
	{ value: CardReactionType.STAR, title: t("components.board.reactionType.star") },
	{ value: CardReactionType.VOTE, title: t("components.board.reactionType.vote") },
]);

const onReactionChange = (value: string | null) => {
	if (value === null) return;

	emit("change-reactions", value === "null" ? null : (value as CardReactionType));
};

const onChange = (field: "commentsEnabled" | "readersCanEdit", value: string | null) => {
	if (value === null) return;

	emit("change", field, value === "null" ? null : value === "true");
};
</script>
