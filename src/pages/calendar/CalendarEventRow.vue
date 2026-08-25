<template>
	<div class="d-flex align-start ga-4">
		<div class="calendar-date rounded bg-primary-lighten pa-2 text-center">
			<div class="text-caption text-uppercase">{{ dateLabel }}</div>
			<div class="font-weight-bold">{{ formatTimeRange(event.startsAt, event.endsAt) }}</div>
		</div>

		<div class="flex-grow-1 min-width-0">
			<h2 class="text-h4 mb-1 text-truncate">{{ event.title }}</h2>
			<p v-if="event.description" class="text-body-2 text-medium-emphasis mb-1">{{ event.description }}</p>
			<p v-if="event.location" class="text-body-2 text-medium-emphasis mb-1">
				<VIcon :icon="mdiLocationExit" size="16" class="mr-1" />
				{{ event.location }}
			</p>
			<VBtn
				v-if="event.contextHref"
				class="mt-2"
				variant="text"
				:href="event.contextHref"
				:prepend-icon="mdiArrowRight"
			>
				{{ getContextLabel(event.contextType) }}
			</VBtn>
		</div>
	</div>
</template>

<script setup lang="ts">
import { formatUtc } from "@/utils/date-time.utils";
import { DashboardCalendarEvent } from "@data-access";
import { mdiArrowRight, mdiLocationExit } from "@icons/material";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{
	event: DashboardCalendarEvent;
	dateLabel: string;
}>();

const formatTimeRange = (start: Date, end?: Date) => {
	const startTime = formatUtc(start, "time");
	const endTime = formatUtc(end, "time");
	return endTime ? `${startTime} – ${endTime}` : startTime;
};

const getContextLabel = (contextType?: "course" | "team") => {
	if (contextType === "course") return t("pages.dashboard.calendar.openCourse");
	if (contextType === "team") return t("pages.dashboard.calendar.openTeam");
	return t("pages.dashboard.calendar.openContext");
};
</script>

<style scoped>
.calendar-date {
	min-width: 92px;
}

.min-width-0 {
	min-width: 0;
}
</style>
