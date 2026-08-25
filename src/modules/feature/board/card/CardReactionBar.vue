<template>
	<VCardActions class="pt-0 pb-2 px-4" data-testid="card-reaction-bar">
		<template v-if="reactions.type === CardReactionType.STAR">
			<VBtn
				v-for="star in 5"
				:key="star"
				:icon="star <= (reactions.ownValue ?? 0) ? mdiStar : mdiStarOutline"
				size="x-small"
				variant="text"
				:aria-label="t('components.boardCard.reaction.star', { count: star })"
				:data-testid="`card-reaction-star-${star}`"
				@click.stop="onReact(star)"
			/>
			<span class="text-caption text-medium-emphasis ml-1" data-testid="card-reaction-summary">
				{{ averageLabel }}
			</span>
		</template>

		<template v-else-if="reactions.type === CardReactionType.VOTE">
			<VBtn
				:icon="mdiArrowUpBold"
				size="x-small"
				:variant="reactions.ownValue === 1 ? 'tonal' : 'text'"
				:aria-label="t('components.boardCard.reaction.upvote')"
				data-testid="card-reaction-upvote"
				@click.stop="onReact(1)"
			/>
			<span class="text-caption mx-1" data-testid="card-reaction-summary">{{ reactions.sum }}</span>
			<VBtn
				:icon="mdiArrowDownBold"
				size="x-small"
				:variant="reactions.ownValue === -1 ? 'tonal' : 'text'"
				:aria-label="t('components.boardCard.reaction.downvote')"
				data-testid="card-reaction-downvote"
				@click.stop="onReact(-1)"
			/>
		</template>

		<template v-else>
			<VBtn
				:prepend-icon="reactions.ownValue ? mdiHeart : mdiHeartOutline"
				size="small"
				:variant="reactions.ownValue ? 'tonal' : 'text'"
				:aria-label="t('components.boardCard.reaction.like')"
				data-testid="card-reaction-like"
				@click.stop="onReact(1)"
			>
				<span data-testid="card-reaction-summary">{{ reactions.count }}</span>
			</VBtn>
		</template>
	</VCardActions>
</template>

<script setup lang="ts">
import { CardReactionsResponse, CardReactionType } from "@api-server";
import {
	mdiArrowDownBold,
	mdiArrowUpBold,
	mdiHeart,
	mdiHeartOutline,
	mdiStar,
	mdiStarOutline,
} from "@icons/material";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	reactions: CardReactionsResponse;
}>();

const emit = defineEmits<{
	(e: "react", value?: number): void;
}>();

const { t } = useI18n();

const averageLabel = computed(() => {
	if (props.reactions.count === 0) return t("components.boardCard.reaction.noRating");

	const average = props.reactions.sum / props.reactions.count;

	return t("components.boardCard.reaction.average", {
		average: average.toFixed(1),
		count: props.reactions.count,
	});
});

// Clicking the value one already gave takes it back, the way a like button works everywhere.
const onReact = (value: number) => emit("react", props.reactions.ownValue === value ? undefined : value);
</script>
