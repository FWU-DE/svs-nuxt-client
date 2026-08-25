<template>
	<VCard class="mb-4" data-testid="board-poll-element" variant="outlined" :ripple="false">
		<ContentElementBar :icon="mdiPoll">
			<template #title>
				{{ t("components.cardElement.pollElement") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.POLL_ELEMENT"
					has-background
					:data-testid="`element-menu-button-${columnIndex}-${rowIndex}-${elementIndex}`"
				>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="onMoveUp" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="onMoveDown" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
			<template #element>
				<div class="pb-2 pr-1">
					<PollElementEdit v-if="isEditMode" v-model="editValue" :has-votes="hasVotes" />
					<template v-else>
						<PollElementDisplay :content="element.content" @vote="onVote" />
					</template>
				</div>
			</template>
		</ContentElementBar>
	</VCard>
</template>

<script setup lang="ts">
import PollElementDisplay from "./PollElementDisplay.vue";
import PollElementEdit from "./PollElementEdit.vue";
import { AnyContentElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { PollContentBody, PollElementResponse } from "@api-server";
import { useBoardFocusHandler, useCardStore } from "@data-board";
import { mdiPoll } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { useDebounceFn } from "@vueuse/core";
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: PollElementResponse;
	isEditMode: boolean;
	isNotFirstElement?: boolean;
	isNotLastElement?: boolean;
	columnIndex: number;
	rowIndex: number;
	elementIndex: number;
}>();

const emit = defineEmits<{
	(e: "delete:element", elementId: string): void;
	(e: "move-down:edit"): void;
	(e: "move-up:edit"): void;
	(e: "move-keyboard:edit", event: KeyboardEvent): void;
}>();

const { t } = useI18n();
const cardStore = useCardStore();
const element = toRef(props, "element");

useBoardFocusHandler(element.value.id, ref(null));

const hasVotes = computed(() => (element.value.content.voterCount ?? 0) > 0);

/**
 * The response carries tallies and the reader's own ballot; the update body carries only the
 * poll's definition. Editing therefore works on its own projection instead of on the element
 * content, so a live result never travels back to the server as if it were a setting.
 */
const toContentBody = (content: PollElementResponse["content"]): PollContentBody => ({
	question: content.question,
	options: content.options.map((option) => ({ id: option.id, text: option.text })),
	anonymous: content.anonymous,
	multipleChoice: content.multipleChoice,
	closed: content.closed,
	showResults: content.showResults,
	resultsReleased: content.resultsReleased,
});

const editValue = ref<PollContentBody>(toContentBody(element.value.content));

watch(
	() => element.value.content,
	(content) => {
		if (!props.isEditMode) {
			editValue.value = toContentBody(content);
		}
	},
	{ deep: true }
);

/**
 * Deliberately not useContentElementState: that composable saves whatever sits in the element's
 * own content object, and for a poll that object is the *result* view. The poll saves its
 * definition instead — the server ignores the response-only fields, but sending them back would
 * mean the edit form had to carry live vote counts around.
 */
const save = useDebounceFn((content: PollContentBody) => {
	cardStore.updateElementRequest({
		element: { ...element.value, content } as unknown as AnyContentElement,
	});
}, 400);

watch(editValue, (value) => save(value), { deep: true });

const onVote = (optionIds: string[]) => {
	cardStore.voteInPollRequest({ elementId: element.value.id, optionIds });
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("boardElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};

const onMoveDown = () => emit("move-down:edit");
const onMoveUp = () => emit("move-up:edit");
</script>
