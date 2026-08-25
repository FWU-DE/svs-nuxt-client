<template>
	<li class="card-comment py-2" :data-testid="`card-comment-${comment.id}`">
		<template v-if="comment.isRemoved">
			<p class="text-caption text-medium-emphasis font-italic mb-0" data-testid="card-comment-removed">
				{{
					comment.removedByModerator
						? t("components.boardCard.comment.removedByModerator")
						: t("components.boardCard.comment.removed")
				}}
			</p>
		</template>

		<template v-else-if="isEditing">
			<VTextarea
				v-model="draft"
				rows="2"
				auto-grow
				density="compact"
				variant="outlined"
				hide-details
				:maxlength="MAX_LENGTH"
				:data-testid="`card-comment-edit-input-${comment.id}`"
			/>
			<div class="d-flex justify-end ga-2 mt-1">
				<VBtn size="small" variant="text" data-testid="card-comment-edit-cancel" @click="onCancelEdit">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VBtn size="small" variant="tonal" :disabled="!isDraftValid" data-testid="card-comment-edit-save" @click="onSaveEdit">
					{{ t("common.actions.save") }}
				</VBtn>
			</div>
		</template>

		<template v-else>
			<div class="d-flex align-start ga-2">
				<div class="flex-grow-1 min-width-0">
					<p class="text-caption text-medium-emphasis mb-0">
						<span data-testid="card-comment-author">{{ comment.authorName }}</span>
						<span v-if="comment.isEdited"> · {{ t("components.boardCard.comment.edited") }}</span>
						<span
							v-if="comment.reportCount"
							class="text-error"
							data-testid="card-comment-report-count"
						>
							· {{ t("components.boardCard.comment.reported", { count: comment.reportCount }) }}
						</span>
					</p>
					<p class="text-body-2 mb-0 comment-text">{{ comment.text }}</p>
				</div>
				<VMenu>
					<template #activator="{ props: menuProps }">
						<VBtn
							v-bind="menuProps"
							:icon="mdiDotsVertical"
							size="x-small"
							variant="text"
							:aria-label="t('components.boardCard.comment.menu')"
							:data-testid="`card-comment-menu-${comment.id}`"
							@click.stop
						/>
					</template>
					<VList density="compact">
						<VListItem v-if="comment.isOwn" data-testid="card-comment-action-edit" @click="onStartEdit">
							{{ t("common.actions.edit") }}
						</VListItem>
						<VListItem
							v-if="comment.isOwn || canModerate"
							data-testid="card-comment-action-remove"
							@click="onRemove"
						>
							{{ t("common.actions.remove") }}
						</VListItem>
						<VListItem
							v-if="!comment.isOwn && !comment.ownReport"
							data-testid="card-comment-action-report"
							@click="onReport"
						>
							{{ t("components.boardCard.comment.report") }}
						</VListItem>
						<VListItem v-if="comment.ownReport" disabled data-testid="card-comment-reported">
							{{ t("components.boardCard.comment.alreadyReported") }}
						</VListItem>
					</VList>
				</VMenu>
			</div>
		</template>
	</li>
</template>

<script setup lang="ts">
import { CardCommentResponse } from "@api-server";
import { mdiDotsVertical } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const MAX_LENGTH = 2000;

const props = defineProps<{
	comment: CardCommentResponse;
	canModerate: boolean;
}>();

const emit = defineEmits<{
	(e: "edit", commentId: string, text: string): void;
	(e: "remove", commentId: string): void;
	(e: "report", commentId: string): void;
}>();

const { t } = useI18n();

const isEditing = ref(false);
const draft = ref("");

const isDraftValid = computed(() => draft.value.trim().length > 0);

const onStartEdit = () => {
	draft.value = props.comment.text;
	isEditing.value = true;
};

const onCancelEdit = () => {
	isEditing.value = false;
};

const onSaveEdit = () => {
	if (!isDraftValid.value) return;

	emit("edit", props.comment.id, draft.value.trim());
	isEditing.value = false;
};

const onRemove = () => emit("remove", props.comment.id);
const onReport = () => emit("report", props.comment.id);
</script>

<style lang="scss" scoped>
.comment-text {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
