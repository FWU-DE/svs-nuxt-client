<template>
	<VCard class="mb-4" data-testid="board-checklist-element" variant="outlined" :ripple="false">
		<ContentElementBar :icon="mdiCheckboxMarkedOutline">
			<template #title>
				{{ element.content.title || t("components.cardElement.checklistElement") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.CHECKLIST_ELEMENT"
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
					<template v-if="isEditMode">
						<VSelect
							:model-value="modelValue.progressMode"
							:items="progressModeItems"
							:label="t('components.cardElement.checklistElement.progressMode')"
							density="compact"
							variant="outlined"
							hide-details
							class="mb-3"
							data-testid="checklist-progress-mode-select"
							@update:model-value="onProgressModeChange"
						/>
						<VAlert
							v-if="showModeResetHint"
							type="info"
							variant="tonal"
							density="compact"
							class="mb-3"
							data-testid="checklist-mode-reset-hint"
						>
							{{ t("components.cardElement.checklistElement.modeResetHint") }}
						</VAlert>
						<VTextField
							:model-value="modelValue.title"
							:label="t('components.cardElement.checklistElement.title')"
							density="compact"
							variant="outlined"
							maxlength="200"
							data-testid="checklist-title-input"
							@update:model-value="onTitleChange"
						/>
						<div v-for="(item, index) in modelValue.items" :key="item.id ?? `new-${index}`" class="d-flex ga-2">
							<VTextField
								:model-value="item.text"
								:label="t('components.cardElement.checklistElement.item', { index: index + 1 })"
								density="compact"
								variant="outlined"
								maxlength="500"
								:data-testid="`checklist-item-input-${index}`"
								@update:model-value="onItemChange(index, $event)"
							/>
							<VBtn
								:icon="mdiTrashCanOutline"
								variant="text"
								size="small"
								class="mt-1"
								:aria-label="t('components.cardElement.checklistElement.removeItem', { index: index + 1 })"
								:data-testid="`checklist-remove-item-${index}`"
								@click="onRemoveItem(index)"
							/>
						</div>
						<VBtn
							variant="text"
							size="small"
							:prepend-icon="mdiPlus"
							:disabled="modelValue.items.length >= 50"
							data-testid="checklist-add-item"
							@click="onAddItem"
						>
							{{ t("components.cardElement.checklistElement.addItem") }}
						</VBtn>
					</template>

					<template v-else>
						<p v-if="element.content.items.length === 0" class="text-body-2 text-medium-emphasis mb-0">
							{{ t("components.cardElement.checklistElement.empty") }}
						</p>
						<VCheckbox
							v-for="item in element.content.items"
							:key="item.id"
							:model-value="item.checked"
							density="compact"
							hide-details
							:label="item.text"
							:data-testid="`checklist-item-${item.id}`"
							@update:model-value="onToggle(item.id, $event)"
						/>
						<p
							v-if="element.content.items.length > 0"
							class="text-caption text-medium-emphasis mt-1 mb-0"
							data-testid="checklist-progress"
						>
							{{
								t("components.cardElement.checklistElement.progress", {
									done: checkedCount,
									total: element.content.items.length,
								})
							}}
							<span v-if="isPerUser" class="ml-1" data-testid="checklist-personal-hint">
								· {{ t("components.cardElement.checklistElement.personal") }}
							</span>
							<span v-if="participantCount !== undefined" class="ml-1" data-testid="checklist-participants">
								· {{ t("components.cardElement.checklistElement.participants", { count: participantCount }) }}
							</span>
						</p>
					</template>
				</div>
			</template>
		</ContentElementBar>
	</VCard>
</template>

<script setup lang="ts">
import { AnyContentElement } from "@/types/board/ContentElement";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { ChecklistContentBody, ChecklistElementResponse, ChecklistProgressMode } from "@api-server";
import { useBoardFocusHandler, useCardStore } from "@data-board";
import { mdiCheckboxMarkedOutline, mdiPlus, mdiTrashCanOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { useDebounceFn } from "@vueuse/core";
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: ChecklistElementResponse;
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

const checkedCount = computed(() => element.value.content.completedCount);
const isPerUser = computed(() => element.value.content.progressMode === ChecklistProgressMode.PER_USER);

const progressModeItems = computed(() => [
	{ value: ChecklistProgressMode.SHARED, title: t("components.cardElement.checklistElement.progressMode.shared") },
	{ value: ChecklistProgressMode.PER_USER, title: t("components.cardElement.checklistElement.progressMode.perUser") },
]);

// Switching the mode drops the progress, because a shared tick and a personal one are not the
// same claim. Say so before the change lands rather than after.
const showModeResetHint = ref(false);

const onProgressModeChange = (progressMode: ChecklistProgressMode) => {
	showModeResetHint.value = progressMode !== element.value.content.progressMode;
	modelValue.value = { ...modelValue.value, progressMode };
};
const participantCount = computed(() => element.value.content.participantCount);

/**
 * Like the poll, the checklist edits its own definition rather than the element content: a new
 * item has to go out *without* an id so the server mints one, which the response shape cannot
 * express, and the checked state is not a setting to be sent back.
 */
const toContentBody = (content: ChecklistElementResponse["content"]): ChecklistContentBody => ({
	title: content.title,
	items: content.items.map((item) => ({ id: item.id, text: item.text })),
	progressMode: content.progressMode,
});

const modelValue = ref<ChecklistContentBody>(toContentBody(element.value.content));

watch(
	() => element.value.content,
	(content) => {
		if (!props.isEditMode) {
			modelValue.value = toContentBody(content);
		}
	},
	{ deep: true }
);

const save = useDebounceFn((content: ChecklistContentBody) => {
	cardStore.updateElementRequest({
		element: { ...element.value, content } as unknown as AnyContentElement,
	});
}, 400);

// Only an edit here is worth saving. When the model was just rebuilt from the server's copy
// (after a tick, or another person's change), it already says what the server has; saving it
// would echo back and rebuild the model again, round after round.
const sameDefinition = (a: ChecklistContentBody, b: ChecklistContentBody) => JSON.stringify(a) === JSON.stringify(b);

watch(
	modelValue,
	(value) => {
		if (sameDefinition(value, toContentBody(element.value.content))) return;
		save(value);
	},
	{ deep: true }
);

const onTitleChange = (title: string) => {
	modelValue.value = { ...modelValue.value, title };
};

const onItemChange = (index: number, text: string) => {
	modelValue.value = {
		...modelValue.value,
		items: modelValue.value.items.map((item, i) => (i === index ? { ...item, text } : item)),
	};
};

const onAddItem = () => {
	modelValue.value = { ...modelValue.value, items: [...modelValue.value.items, { text: "" }] };
};

const onRemoveItem = (index: number) => {
	modelValue.value = { ...modelValue.value, items: modelValue.value.items.filter((_, i) => i !== index) };
};

const onToggle = (itemId: string, checked: boolean | null) => {
	cardStore.setChecklistItemCheckedRequest({ elementId: element.value.id, itemId, checked: checked ?? false });
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.checklistElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};

const onMoveDown = () => emit("move-down:edit");
const onMoveUp = () => emit("move-up:edit");
</script>
