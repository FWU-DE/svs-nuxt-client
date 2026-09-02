<template>
	<SvsDialog
		v-model="isOpen"
		no-confirm
		title="components.board.interactions.title"
		data-testid="board-reaction-type-dialog"
	>
		<template #content>
			<p class="text-subtitle-2 mb-1">{{ t("components.board.reactionType.title") }}</p>
			<p class="text-body-2 text-medium-emphasis mb-2">
				{{ t("components.board.reactionType.description") }}
			</p>
			<VRadioGroup :model-value="selectedType" hide-details @update:model-value="onSelect">
				<VRadio :value="INHERIT" data-testid="reaction-type-inherit">
					<template #label>
						<div>
							<div>{{ t("components.board.settings.inherit") }}</div>
							<div class="text-caption text-medium-emphasis">{{ inheritedReactionLabel }}</div>
						</div>
					</template>
				</VRadio>
				<VRadio
					v-for="option in options"
					:key="option.value"
					:value="option.value"
					:data-testid="`reaction-type-${option.value}`"
				>
					<template #label>
						<div>
							<div>{{ option.title }}</div>
							<div class="text-caption text-medium-emphasis">{{ option.hint }}</div>
						</div>
					</template>
				</VRadio>
			</VRadioGroup>

			<VDivider class="my-4" />

			<p class="text-subtitle-2 mb-1">{{ t("components.board.comments.title") }}</p>
			<p class="text-body-2 text-medium-emphasis mb-2">
				{{ t("components.board.comments.description") }}
			</p>
			<VRadioGroup :model-value="selectedComments" hide-details @update:model-value="onSelectComments">
				<VRadio :value="INHERIT" data-testid="board-comments-inherit">
					<template #label>
						<div>
							<div>{{ t("components.board.settings.inherit") }}</div>
							<div class="text-caption text-medium-emphasis">{{ inheritedCommentsLabel }}</div>
						</div>
					</template>
				</VRadio>
				<VRadio :value="true" data-testid="board-comments-on">
					{{ t("components.board.comments.toggle") }}
				</VRadio>
				<VRadio :value="false" data-testid="board-comments-off">
					{{ t("components.board.settings.off") }}
				</VRadio>
			</VRadioGroup>
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import { CardReactionType } from "@api-server";
import { SvsDialog } from "@ui-dialog";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const isOpen = defineModel({ type: Boolean, required: true });

const props = defineProps({
	/** The board's own setting; null means it follows the room. */
	currentType: {
		type: String as PropType<CardReactionType | null>,
		default: null,
	},
	commentsEnabled: {
		type: [Boolean, null] as PropType<boolean | null>,
		default: null,
	},
	roomReactionType: {
		type: String as PropType<CardReactionType>,
		default: CardReactionType.NONE,
	},
	roomCommentsEnabled: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits<{
	(e: "select", value: CardReactionType | null): void;
	(e: "toggle-comments", value: boolean | null): void;
}>();

const { t } = useI18n();

/**
 * A radio group cannot hold null, so "follows the room" travels as this sentinel and is turned
 * back into null on the way out. Three states, not two: a board that follows the room has to
 * stay distinguishable from one that turned the setting off itself.
 */
const INHERIT = "inherit";

const selectedType = computed(() => props.currentType ?? INHERIT);
const selectedComments = computed(() => props.commentsEnabled ?? INHERIT);

const reactionTypeLabels: Record<CardReactionType, string> = {
	[CardReactionType.NONE]: "components.board.reactionType.none",
	[CardReactionType.LIKE]: "components.board.reactionType.like",
	[CardReactionType.STAR]: "components.board.reactionType.star",
	[CardReactionType.VOTE]: "components.board.reactionType.vote",
};

const inheritedReactionLabel = computed(() =>
	t("components.board.settings.inheritedValue", { value: t(reactionTypeLabels[props.roomReactionType]) })
);

const inheritedCommentsLabel = computed(() =>
	t("components.board.settings.inheritedValue", {
		value: props.roomCommentsEnabled ? t("components.board.comments.toggle") : t("components.board.settings.off"),
	})
);

const options = computed(() => [
	{
		value: CardReactionType.NONE,
		title: t("components.board.reactionType.none"),
		hint: t("components.board.reactionType.none.hint"),
	},
	{
		value: CardReactionType.LIKE,
		title: t("components.board.reactionType.like"),
		hint: t("components.board.reactionType.like.hint"),
	},
	{
		value: CardReactionType.STAR,
		title: t("components.board.reactionType.star"),
		hint: t("components.board.reactionType.star.hint"),
	},
	{
		value: CardReactionType.VOTE,
		title: t("components.board.reactionType.vote"),
		hint: t("components.board.reactionType.vote.hint"),
	},
]);

const onSelect = (value: string | null) => {
	if (value === null) return;

	emit("select", value === INHERIT ? null : (value as CardReactionType));
};

const onSelectComments = (value: string | boolean | null) => {
	if (value === null) return;

	emit("toggle-comments", value === INHERIT ? null : Boolean(value));
};
</script>
