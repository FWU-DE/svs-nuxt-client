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

		<template v-if="boards.length > 0">
			<div class="text-subtitle-2 mt-4 mb-2">{{ t("pages.roomCreate.templates.preview.title") }}</div>
			<RoomTemplateStructure :boards="boards" />
		</template>
	</VSheet>
</template>

<script setup lang="ts">
import RoomTemplateStructure from "./RoomTemplateStructure.vue";
import { ResolvedBoard, RoomTemplate } from "@data-room";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

defineProps({
	template: {
		type: Object as PropType<RoomTemplate>,
		required: true,
	},
	boards: {
		type: Array as PropType<ResolvedBoard[]>,
		default: () => [],
	},
});

const emit = defineEmits<{
	(e: "change"): void;
}>();

const { t } = useI18n();
</script>
