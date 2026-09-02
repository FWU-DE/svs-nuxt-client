<template>
	<SvsDialog
		v-model="isOpen"
		no-confirm
		title="components.boardColumn.settings.title"
		data-testid="column-settings-dialog"
	>
		<template #content>
			<p class="text-body-2 text-medium-emphasis mb-4">
				{{ t("components.boardColumn.settings.description") }}
			</p>

			<VSelect
				:model-value="String(commentsEnabled)"
				:items="commentOptions"
				:label="t('components.board.comments.title')"
				density="compact"
				variant="outlined"
				class="mb-3"
				hide-details
				data-testid="column-settings-comments"
				@update:model-value="onCommentsChange"
			/>

			<VSelect
				:model-value="reactionType ?? INHERIT"
				:items="reactionOptions"
				:label="t('components.board.reactionType.title')"
				density="compact"
				variant="outlined"
				hide-details
				data-testid="column-settings-reactions"
				@update:model-value="onReactionChange"
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
	reactionType: { type: String as PropType<CardReactionType | null>, default: null },
});

const emit = defineEmits<{
	(e: "change-comments", value: boolean | null): void;
	(e: "change-reactions", value: CardReactionType | null): void;
}>();

const { t } = useI18n();

/**
 * A select cannot hold null, so "follows the board" travels as this sentinel and becomes null
 * again on the way out — the third state is what lets a column be handed back to its board.
 */
const INHERIT = "null";

const commentOptions = computed(() => [
	{ value: INHERIT, title: t("components.boardColumn.settings.inherit") },
	{ value: "true", title: t("components.board.comments.toggle") },
	{ value: "false", title: t("components.boardCard.settings.off") },
]);

const reactionOptions = computed(() => [
	{ value: INHERIT, title: t("components.boardColumn.settings.inherit") },
	{ value: CardReactionType.NONE, title: t("components.board.reactionType.none") },
	{ value: CardReactionType.LIKE, title: t("components.board.reactionType.like") },
	{ value: CardReactionType.STAR, title: t("components.board.reactionType.star") },
	{ value: CardReactionType.VOTE, title: t("components.board.reactionType.vote") },
]);

const onCommentsChange = (value: string | null) => {
	if (value === null) return;

	emit("change-comments", value === INHERIT ? null : value === "true");
};

const onReactionChange = (value: string | null) => {
	if (value === null) return;

	emit("change-reactions", value === INHERIT ? null : (value as CardReactionType));
};
</script>
