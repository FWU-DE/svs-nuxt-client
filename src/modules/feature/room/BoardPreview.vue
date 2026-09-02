<template>
	<div :class="['board-preview', { 'board-preview--list': isListBoard }]" aria-hidden="true" :data-testid="dataTestid">
		<div v-if="visibleColumns.length === 0" class="board-preview-empty" />
		<div v-for="(column, columnIndex) in visibleColumns" :key="columnIndex" class="board-preview-column">
			<div v-if="column.title" class="board-preview-column-title">{{ column.title }}</div>
			<div v-else class="board-preview-column-title-placeholder" />
			<div class="board-preview-cards">
				<div
					v-for="(card, cardIndex) in visibleCards(column)"
					:key="cardIndex"
					class="board-preview-card"
					:style="cardStyle(card)"
				>
					<div v-if="showsEmptyCard(card)" class="board-preview-line board-preview-line--short" />
					<div
						v-for="(elementType, elementIndex) in cardElements(card)"
						:key="elementIndex"
						:class="['board-preview-element', `board-preview-element--${elementKind(elementType)}`]"
					>
						<template v-if="elementKind(elementType) === 'text'">
							<div class="board-preview-line" />
							<div class="board-preview-line board-preview-line--short" />
						</template>
						<img
							v-else-if="elementKind(elementType) === 'thumbnail'"
							class="board-preview-thumbnail"
							:src="elementThumbnails[elementType]"
							alt=""
						/>
						<template v-else>
							<VIcon class="board-preview-icon" size="8" :icon="elementIcon(elementType)" />
							<div class="board-preview-line" />
						</template>
					</div>
				</div>
				<div v-if="hiddenCardCount(column) > 0" class="board-preview-more">+{{ hiddenCardCount(column) }}</div>
			</div>
		</div>
		<div v-if="hiddenColumnCount > 0" class="board-preview-more board-preview-more--columns">
			+{{ hiddenColumnCount }}
		</div>
	</div>
</template>

<script setup lang="ts">
import collaborativeEditorThumbnail from "@/assets/img/collaborativeEditor.svg";
import tldrawThumbnail from "@/assets/img/tldraw.svg";
import { colorToHexLighten3, colorToHexLighten5 } from "@/utils/color.utils";
import {
	BoardLayout,
	BoardPreviewCardResponse,
	BoardPreviewColumnResponse,
	BoardPreviewResponse,
	Colors,
	ContentElementType,
} from "@api-server";
import {
	mdiCheckboxMarkedOutline,
	mdiClockOutline,
	mdiCodeTags,
	mdiFileDocumentOutline,
	mdiFolderOpenOutline,
	mdiFormatText,
	mdiLink,
	mdiMicrophoneOutline,
	mdiPoll,
	mdiPuzzleOutline,
	mdiSigma,
	mdiVideoOutline,
} from "@icons/material";
import { computed, PropType, StyleValue } from "vue";

const props = defineProps({
	preview: { type: Object as PropType<BoardPreviewResponse>, required: true },
	layout: { type: String as PropType<BoardLayout>, required: true },
	dataTestid: { type: String, default: undefined },
});

/** A list board stacks its columns, a column board puts them side by side - so does the preview. */
const isListBoard = computed(() => props.layout === BoardLayout.LIST);

/** Beyond this a tile has no room left; the response counts tell how much is missing. */
const maxColumns = computed(() => (isListBoard.value ? 2 : 5));

const maxElementsPerCard = 2;

const visibleColumns = computed(() => props.preview?.columns.slice(0, maxColumns.value) ?? []);

const hiddenColumnCount = computed(() => (props.preview?.columnCount ?? 0) - visibleColumns.value.length);

/** A single stacked column gets the whole tile height, several have to share it. */
const maxCardsPerColumn = computed(() => {
	if (!isListBoard.value) return 3;

	return visibleColumns.value.length > 1 ? 2 : 4;
});

/** A column with more cards than fit spends its last slot on the "+n" instead of half a card. */
const visibleCards = (column: BoardPreviewColumnResponse) => {
	const hasHiddenCards = column.cardCount > maxCardsPerColumn.value;

	return column.cards.slice(0, hasHiddenCards ? maxCardsPerColumn.value - 1 : maxCardsPerColumn.value);
};

const hiddenCardCount = (column: BoardPreviewColumnResponse) => column.cardCount - visibleCards(column).length;

/**
 * Elements the board itself shows as a picture keep that picture here - the same illustration,
 * just small. Text becomes grey placeholder lines, everything else its icon.
 */
const elementThumbnails: Partial<Record<ContentElementType, string>> = {
	[ContentElementType.DRAWING]: tldrawThumbnail,
	[ContentElementType.COLLABORATIVE_TEXT_EDITOR]: collaborativeEditorThumbnail,
};

/**
 * A card whose content is a picture shows that picture and nothing else - the same way the
 * whiteboard or the collaborative document dominates the real card.
 */
const cardElements = (card: BoardPreviewCardResponse) => {
	const thumbnailType = card.elementTypes.find((elementType) => elementThumbnails[elementType]);

	return thumbnailType ? [thumbnailType] : card.elementTypes.slice(0, maxElementsPerCard);
};

/** An empty card still gets one line, so it reads as a card instead of a gap. */
const showsEmptyCard = (card: BoardPreviewCardResponse) => card.elementTypes.length === 0;

/** A card without a color would be white on white, so it gets the same faint border as an empty column. */
const subtleBorderColor = "rgba(var(--v-theme-on-surface), 0.16)";

const cardStyle = (card: BoardPreviewCardResponse): StyleValue => {
	const isTransparent = card.backgroundColor === Colors.TRANSPARENT;

	return {
		backgroundColor: colorToHexLighten5(card.backgroundColor) ?? "rgb(var(--v-theme-white))",
		borderColor: isTransparent ? subtleBorderColor : (colorToHexLighten3(card.backgroundColor) ?? subtleBorderColor),
	};
};

const textElementTypes: ContentElementType[] = [ContentElementType.RICH_TEXT];

const elementKind = (elementType: ContentElementType): "thumbnail" | "text" | "icon" => {
	if (elementThumbnails[elementType]) return "thumbnail";
	if (textElementTypes.includes(elementType)) return "text";

	return "icon";
};

const elementIcons: Partial<Record<ContentElementType, string>> = {
	[ContentElementType.RICH_TEXT]: mdiFormatText,
	[ContentElementType.FILE]: mdiFileDocumentOutline,
	[ContentElementType.FILE_FOLDER]: mdiFolderOpenOutline,
	[ContentElementType.LINK]: mdiLink,
	[ContentElementType.EXTERNAL_TOOL]: mdiPuzzleOutline,
	[ContentElementType.VIDEO_CONFERENCE]: mdiVideoOutline,
	[ContentElementType.H5P]: "$h5pOutline",
	[ContentElementType.POLL]: mdiPoll,
	[ContentElementType.DEADLINE]: mdiClockOutline,
	[ContentElementType.CHECKLIST]: mdiCheckboxMarkedOutline,
	[ContentElementType.CODE]: mdiCodeTags,
	[ContentElementType.FORMULA]: mdiSigma,
	[ContentElementType.RECORDING]: mdiMicrophoneOutline,
};

const elementIcon = (elementType: ContentElementType) => elementIcons[elementType] ?? mdiFileDocumentOutline;
</script>

<style lang="scss" scoped>
.board-preview {
	display: flex;
	gap: 4px;
	height: 112px;
	padding: 6px;
	overflow: hidden;
	background-color: rgba(var(--v-theme-on-surface), 0.04);
	border-radius: 4px;
}

.board-preview--list {
	flex-direction: column;
}

.board-preview-column {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
	padding: 3px;
	overflow: hidden;
	background-color: rgb(var(--v-theme-white));
	border-radius: 3px;
}

.board-preview-column-title {
	font-size: 7px;
	font-weight: 700;
	line-height: 1.2;
	color: rgba(var(--v-theme-on-surface), 0.6);
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.board-preview-column-title-placeholder {
	height: 3px;
	background-color: rgba(var(--v-theme-on-surface), 0.16);
	border-radius: 2px;
}

.board-preview-cards {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 3px;
	min-height: 0;
	overflow: hidden;
}

.board-preview-card {
	display: flex;
	flex: 0 0 auto;
	flex-direction: column;
	gap: 2px;
	min-height: 10px;
	padding: 2px;
	border: 1px solid;
	border-radius: 2px;
}

.board-preview-element--text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.board-preview-element--icon {
	display: flex;
	align-items: center;
	gap: 2px;
}

.board-preview-line {
	flex: 1 1 auto;
	height: 2px;
	background-color: rgba(var(--v-theme-on-surface), 0.2);
	border-radius: 1px;
}

.board-preview-line--short {
	flex: 0 0 auto;
	width: 60%;
}

.board-preview-thumbnail {
	display: block;
	/* A wide card would crop the illustration into an unreadable strip, so the thumbnail keeps its own size. */
	width: 32px;
	max-width: 100%;
	height: 18px;
	object-fit: cover;
	object-position: center;
	border-radius: 1px;
	opacity: 0.9;
}

.board-preview-icon {
	flex: 0 0 auto;
	color: rgba(var(--v-theme-on-surface), 0.5);
}

.board-preview-more {
	font-size: 7px;
	line-height: 1;
	color: rgba(var(--v-theme-on-surface), 0.5);
}

.board-preview-more--columns {
	align-self: flex-end;
}

.board-preview-empty {
	flex: 1 1 auto;
	border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
	border-radius: 3px;
}
</style>
