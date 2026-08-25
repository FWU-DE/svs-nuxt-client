<template>
	<VCard class="mb-4" data-testid="board-code-element" variant="outlined" :ripple="false">
		<ContentElementBar :icon="mdiCodeTags">
			<template #title>
				{{ element.content.language || t("components.cardElement.codeElement") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.CODE_ELEMENT"
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
							:model-value="modelValue.language"
							:items="languages"
							:label="t('components.cardElement.codeElement.language')"
							density="compact"
							variant="outlined"
							class="mb-2"
							hide-details
							data-testid="code-language-select"
							@update:model-value="onLanguageChange"
						/>
						<VTextarea
							:model-value="modelValue.code"
							:label="t('components.cardElement.codeElement.code')"
							rows="6"
							auto-grow
							density="compact"
							variant="outlined"
							hide-details
							class="code-input"
							data-testid="code-input"
							@update:model-value="onCodeChange"
						/>
					</template>
					<template v-else>
						<pre class="code-block" data-testid="code-display"><code>{{ element.content.code }}</code></pre>
						<VBtn
							size="x-small"
							variant="text"
							:prepend-icon="mdiContentCopy"
							data-testid="code-copy"
							@click.stop="onCopy"
						>
							{{ t("components.cardElement.codeElement.copy") }}
						</VBtn>
					</template>
				</div>
			</template>
		</ContentElementBar>
	</VCard>
</template>

<script setup lang="ts">
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { CodeElementResponse } from "@api-server";
import { notifySuccess } from "@data-app";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { mdiCodeTags, mdiContentCopy } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: CodeElementResponse;
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

/**
 * A label, not a parser: the block is rendered as plain text in a monospace font. Nothing here
 * highlights or executes anything, which is also why an unknown language is harmless.
 */
const languages = [
	"plaintext",
	"python",
	"javascript",
	"typescript",
	"java",
	"c",
	"cpp",
	"csharp",
	"html",
	"css",
	"sql",
	"bash",
	"json",
	"xml",
];

const onLanguageChange = (value: string) => {
	modelValue.value.language = value;
};

const onCodeChange = (value: string) => {
	modelValue.value.code = value;
};

const onCopy = async () => {
	await navigator.clipboard.writeText(element.value.content.code);
	notifySuccess("components.cardElement.codeElement.copied");
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

<style lang="scss" scoped>
.code-block {
	font-family: monospace;
	font-size: var(--text-sm);
	background: rgba(var(--v-theme-on-surface), 0.04);
	border-radius: 4px;
	padding: 8px 12px;
	margin: 0;
	overflow-x: auto;
	white-space: pre;
}

.code-input :deep(textarea) {
	font-family: monospace;
	font-size: var(--text-sm);
}
</style>
