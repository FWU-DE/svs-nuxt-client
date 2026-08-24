<template>
	<div>
		<p class="text-body-1 mb-6" data-testid="room-template-picker-subtitle">
			{{ t("pages.roomCreate.templates.subtitle") }}
		</p>
		<VRow>
			<VCol v-for="template in roomTemplates" :key="template.id" cols="12" sm="6" md="4">
				<VCard
					class="room-template-card d-flex flex-column"
					height="100%"
					variant="outlined"
					role="button"
					tabindex="0"
					:ripple="false"
					:data-testid="`room-template-${template.id}`"
					:aria-label="t(template.titleKey)"
					@click="emit('select', template)"
					@keydown.enter.prevent="emit('select', template)"
					@keydown.space.prevent="emit('select', template)"
				>
					<VCardItem>
						<template #prepend>
							<VAvatar rounded="lg" :class="`room-color--${template.color}`">
								<VIcon :icon="template.icon" color="white" />
							</VAvatar>
						</template>
						<VCardTitle>
							<h2 class="text-break text-body-1 font-weight-bold ma-0">{{ t(template.titleKey) }}</h2>
						</VCardTitle>
					</VCardItem>
					<VCardText class="flex-grow-1">
						<p class="text-body-2">{{ t(template.descriptionKey) }}</p>
						<div v-if="template.boards.length > 0" class="d-flex flex-wrap ga-1 mt-3">
							<VChip
								v-for="columnTitle in previewColumnTitles(template)"
								:key="columnTitle"
								size="x-small"
								variant="tonal"
							>
								{{ columnTitle }}
							</VChip>
							<VChip v-if="hiddenColumnCount(template) > 0" size="x-small" variant="tonal">
								{{ t("pages.roomCreate.templates.preview.more", { count: hiddenColumnCount(template) }) }}
							</VChip>
						</div>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>
	</div>
</template>

<script setup lang="ts">
import { RoomTemplate, roomTemplates } from "@data-room";
import { useI18n } from "vue-i18n";

const MAX_PREVIEW_COLUMNS = 4;

const emit = defineEmits<{
	(e: "select", template: RoomTemplate): void;
}>();

const { t } = useI18n();

const allColumns = (template: RoomTemplate) => template.boards.flatMap((board) => board.columns);

const previewColumnTitles = (template: RoomTemplate) =>
	allColumns(template)
		.slice(0, MAX_PREVIEW_COLUMNS)
		.map((column) => t(column.titleKey));

const hiddenColumnCount = (template: RoomTemplate) => Math.max(allColumns(template).length - MAX_PREVIEW_COLUMNS, 0);
</script>

<style lang="scss" scoped>
.room-template-card {
	cursor: pointer;

	&:hover,
	&:focus-visible {
		border-color: rgba(var(--v-theme-on-surface));
	}
}
</style>
