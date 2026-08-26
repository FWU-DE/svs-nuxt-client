<template>
	<VCard class="mb-4" data-testid="board-formula-element" variant="outlined" :ripple="false">
		<ContentElementBar :icon="mdiSigma">
			<template #title>
				{{ t("components.cardElement.formulaElement") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.FORMULA_ELEMENT"
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
					<VTextarea
						v-if="isEditMode"
						:model-value="modelValue.latex"
						:label="t('components.cardElement.formulaElement.latex')"
						rows="2"
						auto-grow
						density="compact"
						variant="outlined"
						:error-messages="renderError ? [renderError] : []"
						class="latex-input"
						data-testid="formula-input"
						@update:model-value="onLatexChange"
					/>
					<div
						v-if="rendered"
						class="formula-display"
						data-testid="formula-display"
						v-html="rendered"
					/>
					<p v-else-if="!isEditMode" class="text-body-2 text-medium-emphasis mb-0" data-testid="formula-empty">
						{{ t("components.cardElement.formulaElement.empty") }}
					</p>
				</div>
			</template>
		</ContentElementBar>
	</VCard>
</template>

<script setup lang="ts">
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { FormulaElementResponse } from "@api-server";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { mdiSigma } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import katex from "katex";
import "katex/dist/katex.min.css";
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: FormulaElementResponse;
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

const renderError = ref<string | undefined>(undefined);

// While editing, the preview follows the draft; otherwise it follows what the server stored.
const source = computed(() => (props.isEditMode ? modelValue.value.latex : element.value.content.latex));

/**
 * KaTeX in non-throwing mode still escapes what it cannot parse, so the output is safe to
 * insert as markup even though the source comes from a user.
 */
const rendered = computed(() => {
	if (!source.value) {
		renderError.value = undefined;
		return "";
	}

	try {
		const html = katex.renderToString(source.value, { displayMode: true, throwOnError: true });
		renderError.value = undefined;
		return html;
	} catch (error) {
		renderError.value = error instanceof Error ? error.message : t("components.cardElement.formulaElement.invalid");
		return katex.renderToString(source.value, { displayMode: true, throwOnError: false });
	}
});

const onLatexChange = (value: string) => {
	modelValue.value.latex = value;
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.formulaElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};

const onMoveDown = () => emit("move-down:edit");
const onMoveUp = () => emit("move-up:edit");
</script>

<style lang="scss" scoped>
.formula-display {
	overflow-x: auto;
}

.latex-input :deep(textarea) {
	font-family: monospace;
	font-size: var(--text-sm);
}
</style>
