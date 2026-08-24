<template>
	<div data-testid="room-template-structure">
		<div v-for="(board, boardIndex) in boards" :key="boardIndex" class="mb-4">
			<div class="d-flex align-center ga-2 mb-2">
				<VIcon
					v-if="showProgress"
					:icon="iconFor(boardKey(boardIndex))"
					size="small"
					:color="colorFor(boardKey(boardIndex))"
				/>
				<span class="text-subtitle-2">{{ board.title }}</span>
				<span class="text-caption text-medium-emphasis">
					{{
						board.layout === BoardLayout.LIST
							? t("pages.room.dialog.boardLayout.singleColumn")
							: t("pages.room.dialog.boardLayout.multiColumn")
					}}
				</span>
			</div>
			<div class="d-flex ga-3 overflow-x-auto pb-2">
				<div
					v-for="(column, columnIndex) in board.columns"
					:key="columnIndex"
					class="template-column rounded pa-2"
					:class="{ 'template-item--pending': isPending(columnKey(boardIndex, columnIndex)) }"
					:data-testid="`template-column-${boardIndex}-${columnIndex}`"
				>
					<div class="text-caption font-weight-bold mb-2 text-truncate">{{ column.title }}</div>
					<div
						v-for="(card, cardIndex) in column.cards"
						:key="cardIndex"
						class="template-card rounded pa-2 mb-2 text-caption"
						:class="{ 'template-item--pending': isPending(cardKey(boardIndex, columnIndex, cardIndex)) }"
						:style="cardStyle(card)"
						:data-testid="`template-card-${boardIndex}-${columnIndex}-${cardIndex}`"
					>
						<div class="d-flex align-center ga-1">
							<VIcon
								v-if="showProgress"
								:icon="iconFor(cardKey(boardIndex, columnIndex, cardIndex))"
								size="x-small"
								:color="colorFor(cardKey(boardIndex, columnIndex, cardIndex))"
							/>
							<span class="text-truncate">{{ card.title }}</span>
						</div>
						<div v-if="card.elements.length > 0" class="d-flex ga-1 mt-1 text-medium-emphasis">
							<VIcon
								v-for="(element, elementIndex) in card.elements"
								:key="elementIndex"
								:icon="ELEMENT_ICONS[element.kind]"
								size="x-small"
								:aria-label="t(`pages.roomCreate.templates.element.${element.kind}`)"
								:data-testid="`template-element-${element.kind}`"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { BoardLayout, Colors } from "@api-server";
import { boardKey, cardKey, columnKey, ResolvedBoard, ResolvedCard, ResolvedElement } from "@data-room";
import {
	mdiCheckCircle,
	mdiCircleOutline,
	mdiFolderOpenOutline,
	mdiFormatText,
	mdiLink,
	mdiOpenInNew,
	mdiPalette,
	mdiTextBoxEditOutline,
	mdiVideoOutline,
} from "@icons/material";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

const ELEMENT_ICONS: Record<ResolvedElement["kind"], string> = {
	text: mdiFormatText,
	link: mdiLink,
	boardLink: mdiOpenInNew,
	folder: mdiFolderOpenOutline,
	drawing: mdiPalette,
	collaborative: mdiTextBoxEditOutline,
	videoConference: mdiVideoOutline,
};

/** the board renders the real card colours, the preview only hints at them */
const CARD_COLORS: Partial<Record<Colors, string>> = {
	[Colors.RED]: "#d50000",
	[Colors.ORANGE]: "#ef6c00",
	[Colors.AMBER]: "#ffab00",
	[Colors.YELLOW]: "#f9a825",
	[Colors.GREEN]: "#2e7d32",
	[Colors.TEAL]: "#00796b",
	[Colors.BLUE]: "#1565c0",
	[Colors.LIGHT_BLUE]: "#0288d1",
	[Colors.PURPLE]: "#7b1fa2",
	[Colors.GREY]: "#616161",
	[Colors.BLUE_GREY]: "#455b6a",
};

const props = defineProps({
	boards: {
		type: Array as PropType<ResolvedBoard[]>,
		required: true,
	},
	/** while the room is being built, items that do not exist yet are dimmed */
	showProgress: {
		type: Boolean,
		default: false,
	},
	createdKeys: {
		type: Array as PropType<string[]>,
		default: () => [],
	},
});

const { t } = useI18n();

const isCreated = (key: string) => props.createdKeys.includes(key);
const isPending = (key: string) => props.showProgress && !isCreated(key);
const iconFor = (key: string) => (isCreated(key) ? mdiCheckCircle : mdiCircleOutline);
const colorFor = (key: string) => (isCreated(key) ? "success" : "medium-emphasis");

const cardStyle = (card: ResolvedCard) => {
	const color = card.color ? CARD_COLORS[card.color] : undefined;
	return color ? { borderLeft: `4px solid ${color}` } : {};
};
</script>

<style lang="scss" scoped>
.template-column {
	min-width: 160px;
	max-width: 200px;
	background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.template-card {
	background-color: rgb(var(--v-theme-surface));
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.template-item--pending {
	opacity: 0.4;
	transition: opacity 0.3s ease-in;
}
</style>
