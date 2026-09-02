<template>
	<div class="px-4 pb-3" data-testid="card-comment-section">
		<VBtn
			size="small"
			variant="text"
			:prepend-icon="mdiCommentTextOutline"
			data-testid="card-comment-toggle"
			@click.stop="isOpen = !isOpen"
		>
			{{ t("components.boardCard.comment.count", { count: visibleCount }) }}
		</VBtn>

		<template v-if="isOpen">
			<ul class="comment-list mt-1">
				<CardComment
					v-for="comment in comments"
					:key="comment.id"
					:comment="comment"
					:can-moderate="canModerate"
					@edit="onEdit"
					@remove="onRemove"
					@report="onReport"
				/>
			</ul>

			<VTextarea
				v-model="draft"
				rows="1"
				auto-grow
				density="compact"
				variant="outlined"
				class="mt-2"
				:maxlength="MAX_LENGTH"
				:label="t('components.boardCard.comment.placeholder')"
				:hint="t('components.boardCard.comment.hint')"
				persistent-hint
				data-testid="card-comment-input"
				@click.stop
				@keydown.stop
				@keydown.enter.exact.prevent="onSubmit"
			/>
			<div class="d-flex justify-end mt-1">
				<VBtn
					size="small"
					variant="tonal"
					:disabled="!isDraftValid"
					data-testid="card-comment-submit"
					@click.stop="onSubmit"
				>
					{{ t("components.boardCard.comment.submit") }}
				</VBtn>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import CardComment from "./CardComment.vue";
import { CardCommentResponse } from "@api-server";
import { mdiCommentTextOutline } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const MAX_LENGTH = 2000;

const props = defineProps<{
	comments: CardCommentResponse[];
	canModerate: boolean;
}>();

const emit = defineEmits<{
	(e: "add", text: string): void;
	(e: "edit", commentId: string, text: string): void;
	(e: "remove", commentId: string): void;
	(e: "report", commentId: string): void;
}>();

const { t } = useI18n();

const isOpen = ref(false);
const draft = ref("");

const isDraftValid = computed(() => draft.value.trim().length > 0);

// Removed comments keep their place in the thread, but counting them would tell everyone how
// much was deleted — the count is about what there is to read.
const visibleCount = computed(() => props.comments.filter((comment) => !comment.isRemoved).length);

const onSubmit = () => {
	if (!isDraftValid.value) return;

	emit("add", draft.value.trim());
	draft.value = "";
};

const onEdit = (commentId: string, text: string) => emit("edit", commentId, text);
const onRemove = (commentId: string) => emit("remove", commentId);
const onReport = (commentId: string) => emit("report", commentId);
</script>

<style lang="scss" scoped>
.comment-list {
	list-style: none;
	padding: 0;
	margin: 0;
}
</style>
