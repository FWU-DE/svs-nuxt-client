<template>
	<VSheet border rounded class="pa-4 mb-8" data-testid="room-template-summary">
		<div class="d-flex align-center ga-4">
			<VAvatar rounded="lg" :class="`room-color--${template.color}`">
				<VIcon :icon="template.icon" color="white" />
			</VAvatar>
			<div>
				<div class="text-body-1 font-weight-bold" data-testid="room-template-summary-title">
					{{ t(template.titleKey) }}
				</div>
				<div class="text-body-2 text-medium-emphasis">{{ t(template.descriptionKey) }}</div>
			</div>
			<VSpacer />
			<VBtn variant="text" color="primary" data-testid="room-template-change-btn" @click="emit('change')">
				{{ t("pages.roomCreate.templates.change") }}
			</VBtn>
		</div>

		<template v-if="template.boards.length > 0">
			<div class="text-subtitle-2 mt-4">{{ t("pages.roomCreate.templates.preview.title") }}</div>
			<ul class="mt-1 pl-5 text-body-2">
				<li v-for="board in template.boards" :key="board.titleKey">
					<span class="font-weight-bold">{{ t(board.titleKey) }}</span>
					<span v-if="board.columns.length > 0">: {{ columnTitles(board) }}</span>
				</li>
			</ul>
		</template>
	</VSheet>
</template>

<script setup lang="ts">
import { RoomTemplate, RoomTemplateBoard } from "@data-room";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

defineProps({
	template: {
		type: Object as PropType<RoomTemplate>,
		required: true,
	},
});

const emit = defineEmits<{
	(e: "change"): void;
}>();

const { t } = useI18n();

const columnTitles = (board: RoomTemplateBoard) => board.columns.map((column) => t(column.titleKey)).join(" · ");
</script>
