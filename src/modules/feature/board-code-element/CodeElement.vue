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
						<div class="d-flex ga-4 flex-wrap mb-1">
							<VSwitch
								:model-value="modelValue.showLineNumbers"
								:label="t('components.cardElement.codeElement.lineNumbers')"
								density="compact"
								hide-details
								color="primary"
								data-testid="code-line-numbers-switch"
								@update:model-value="onLineNumbersChange"
							/>
							<VSwitch
								:model-value="modelValue.syntaxHighlighting"
								:label="t('components.cardElement.codeElement.highlighting')"
								density="compact"
								hide-details
								color="primary"
								data-testid="code-highlighting-switch"
								@update:model-value="onHighlightingChange"
							/>
						</div>
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
						<!-- eslint-disable vue/no-v-html -- highlight.js escapes its output, and escapeHtml covers the unhighlighted path. The markup cannot be split onto its own line: this is a <pre>, where any added newline shows up in the rendered code. -->
						<pre
							class="code-block"
							:class="{ 'code-block--numbered': showLineNumbers }"
							data-testid="code-display"
						><code
							v-for="line in renderedLines"
							:key="line.number"
							class="code-line"
						><span
							v-if="showLineNumbers"
							class="code-line-number"
							aria-hidden="true"
							data-testid="code-line-number"
						>{{ line.number }}</span><span class="code-line-text" v-html="line.html" /></code></pre>
						<!-- eslint-enable vue/no-v-html -->
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
import "highlight.js/styles/github.css";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { CodeElementResponse } from "@api-server";
import { notifySuccess } from "@data-app";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { mdiCodeTags, mdiContentCopy } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import hljs from "highlight.js/lib/common";
import { computed, ref, toRef } from "vue";
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

const showLineNumbers = computed(() => element.value.content.showLineNumbers);

/**
 * highlight.js escapes what it emits, so its output is safe to insert as markup. With
 * highlighting off — or for a language it does not know — the code is escaped here instead and
 * rendered as plain text, which is also what keeps an unknown language harmless.
 */
const escapeHtml = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const highlighted = computed(() => {
	const code = element.value.content.code;
	if (!element.value.content.syntaxHighlighting) {
		return escapeHtml(code);
	}

	const language = element.value.content.language;
	if (!language || language === "plaintext" || !hljs.getLanguage(language)) {
		return escapeHtml(code);
	}

	try {
		return hljs.highlight(code, { language, ignoreIllegals: true }).value;
	} catch {
		return escapeHtml(code);
	}
});

// Split after highlighting, so a line number can sit in front of each line without breaking
// the markup that highlight.js produced.
const renderedLines = computed(() =>
	highlighted.value.split("\n").map((html, index) => ({ number: index + 1, html: html || " " }))
);

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

const onLineNumbersChange = (value: boolean | null) => {
	modelValue.value.showLineNumbers = value ?? false;
};

const onHighlightingChange = (value: boolean | null) => {
	modelValue.value.syntaxHighlighting = value ?? false;
};

const onCopy = async () => {
	await navigator.clipboard.writeText(element.value.content.code);
	notifySuccess("components.cardElement.codeElement.copied");
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("components.cardElement.codeElement");
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

.code-line {
	display: block;
}

.code-line-number {
	display: inline-block;
	width: 2.5em;
	margin-right: 8px;
	text-align: right;
	opacity: 0.45;
	user-select: none;
}

// highlight.js ships a light theme; these keep it readable on a dark surface as well.
:deep(.hljs-comment),
:deep(.hljs-quote) {
	opacity: 0.7;
	font-style: italic;
}

.code-input :deep(textarea) {
	font-family: monospace;
	font-size: var(--text-sm);
}
</style>
