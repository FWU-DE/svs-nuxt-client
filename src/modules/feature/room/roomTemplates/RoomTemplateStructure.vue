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
						class="template-card rounded pa-2 mb-2 text-caption d-flex align-center ga-1"
						:class="{ 'template-item--pending': isPending(cardKey(boardIndex, columnIndex, cardIndex)) }"
						:data-testid="`template-card-${boardIndex}-${columnIndex}-${cardIndex}`"
					>
						<VIcon
							v-if="showProgress"
							:icon="iconFor(cardKey(boardIndex, columnIndex, cardIndex))"
							size="x-small"
							:color="colorFor(cardKey(boardIndex, columnIndex, cardIndex))"
						/>
						<span class="text-truncate">{{ card.title }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { BoardLayout } from "@api-server";
import { boardKey, cardKey, columnKey, ResolvedBoard } from "@data-room";
import { mdiCheckCircle, mdiCircleOutline } from "@icons/material";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

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
