<template>
	<SvsDialog
		v-model="isOpen"
		no-confirm
		title="components.board.reactionType.title"
		data-testid="board-reaction-type-dialog"
	>
		<template #content>
			<p class="text-body-2 text-medium-emphasis mb-4">
				{{ t("components.board.reactionType.description") }}
			</p>
			<VRadioGroup :model-value="currentType" hide-details @update:model-value="onSelect">
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
	currentType: {
		type: String as PropType<CardReactionType>,
		default: CardReactionType.NONE,
	},
});

const emit = defineEmits<{
	(e: "select", value: CardReactionType): void;
}>();

const { t } = useI18n();

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

const onSelect = (value: CardReactionType | null) => {
	if (value === null) return;

	emit("select", value);
	isOpen.value = false;
};
</script>
