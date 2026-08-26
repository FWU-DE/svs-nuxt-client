<template>
	<VCard class="mb-4" data-testid="board-deadline-element" variant="outlined" :ripple="false">
		<ContentElementBar :icon="mdiClockOutline">
			<template #title>
				{{ title }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.DEADLINE_ELEMENT"
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
						<VTextField
							:model-value="modelValue.title"
							:label="t('components.cardElement.deadlineElement.title')"
							density="compact"
							variant="outlined"
							maxlength="200"
							data-testid="deadline-title-input"
							@update:model-value="onTitleChange"
						/>
						<VTextField
							:model-value="localDateTime"
							:label="t('components.cardElement.deadlineElement.dueDate')"
							type="datetime-local"
							density="compact"
							variant="outlined"
							hide-details
							clearable
							data-testid="deadline-date-input"
							@update:model-value="onDateChange"
						/>
						<VSwitch
							:model-value="modelValue.showInCalendar"
							:label="t('components.cardElement.deadlineElement.showInCalendar')"
							:disabled="!modelValue.dueDate"
							:hint="t('components.cardElement.deadlineElement.showInCalendar.hint')"
							persistent-hint
							density="compact"
							color="primary"
							class="mt-2"
							data-testid="deadline-calendar-switch"
							@update:model-value="onShowInCalendarChange"
						/>
					</template>
					<template v-else>
						<p v-if="!element.content.dueDate" class="text-body-2 text-medium-emphasis mb-0" data-testid="deadline-none">
							{{ t("components.cardElement.deadlineElement.noDate") }}
						</p>
						<template v-else>
							<p class="text-body-2 mb-0" data-testid="deadline-date">{{ formattedDate }}</p>
							<div class="d-flex align-center ga-2 mt-1">
								<VChip size="small" :color="chipColor" variant="tonal" data-testid="deadline-remaining">
									{{ remainingLabel }}
								</VChip>
								<VChip
									v-if="element.content.showInCalendar"
									size="small"
									variant="tonal"
									:prepend-icon="mdiCalendarOutline"
									data-testid="deadline-in-calendar-chip"
								>
									{{ t("components.cardElement.deadlineElement.inCalendar") }}
								</VChip>
							</div>
						</template>
					</template>
				</div>
			</template>
		</ContentElementBar>
	</VCard>
</template>

<script setup lang="ts">
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { DeadlineElementResponse } from "@api-server";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { mdiCalendarOutline, mdiClockOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
// Importing the util registers the dayjs plugins this element needs (relativeTime, localizedFormat).
import "@/utils/date-time.utils";
import dayjs from "dayjs";
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: DeadlineElementResponse;
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
const element = toRef(props, "element");

useBoardFocusHandler(element.value.id, ref(null));

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });

const title = computed(() => element.value.content.title || t("components.cardElement.deadlineElement"));

const formattedDate = computed(() =>
	element.value.content.dueDate ? dayjs(element.value.content.dueDate).format("LLL") : ""
);

// The input speaks local time without a zone; the stored value is an instant.
const localDateTime = computed(() =>
	modelValue.value.dueDate ? dayjs(modelValue.value.dueDate).format("YYYY-MM-DDTHH:mm") : ""
);

const isPast = computed(() => !!element.value.content.dueDate && dayjs(element.value.content.dueDate).isBefore(dayjs()));

/**
 * A date that has passed is stated, not judged: the board does not know whether anything was
 * owed, by whom, or whether it already happened. Only a date that is still ahead and close gets
 * a colour, because that is a hint rather than a verdict.
 */
const chipColor = computed(() => {
	if (isPast.value) return undefined;

	return dayjs(element.value.content.dueDate).diff(dayjs(), "hour") < 48 ? "warning" : undefined;
});

const remainingLabel = computed(() =>
	isPast.value
		? t("components.cardElement.deadlineElement.past", { time: dayjs(element.value.content.dueDate).fromNow() })
		: t("components.cardElement.deadlineElement.remaining", { time: dayjs(element.value.content.dueDate).fromNow() })
);

const onTitleChange = (value: string) => {
	modelValue.value.title = value;
};

const onDateChange = (value: string | null) => {
	modelValue.value.dueDate = value ? dayjs(value).toISOString() : null;
	// A deadline without a date has nothing to put in a calendar.
	if (!value) {
		modelValue.value.showInCalendar = false;
	}
};

const onShowInCalendarChange = (value: boolean | null) => {
	modelValue.value.showInCalendar = value ?? false;
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.deadlineElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};

const onMoveDown = () => emit("move-down:edit");
const onMoveUp = () => emit("move-up:edit");
</script>
