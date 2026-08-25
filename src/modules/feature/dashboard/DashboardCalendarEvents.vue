<template>
	<section class="mt-10" data-testid="dashboard-calendar-events">
		<div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
			<div>
				<h2 class="mb-1">{{ t("pages.dashboard.calendar.title") }}</h2>
				<p class="text-medium-emphasis mb-0">{{ t("pages.dashboard.calendar.subtitle") }}</p>
			</div>
			<VBtn variant="outlined" to="/dashboard" data-testid="dashboard-calendar-show-all">
				{{ t("pages.dashboard.calendar.showAll") }}
			</VBtn>
		</div>

		<SvsLoading :loading-state="eventsLoadingState">
			<VCard v-if="events.length === 0" variant="outlined" data-testid="dashboard-calendar-empty">
				<VCardText class="d-flex align-center">
					<VAvatar color="primary-lighten" class="mr-4">
						<VIcon :icon="mdiCalendarOutline" />
					</VAvatar>
					<div>
						<div class="font-weight-bold">{{ t("pages.dashboard.calendar.empty.title") }}</div>
						<div class="text-medium-emphasis">{{ t("pages.dashboard.calendar.empty.text") }}</div>
					</div>
				</VCardText>
			</VCard>

			<VRow v-else dense data-testid="dashboard-calendar-list">
				<VCol v-for="event in events" :key="event.id" cols="12" md="6" xl="4">
					<VCard class="h-100" variant="outlined" data-testid="dashboard-calendar-item">
						<VCardText class="d-flex align-start ga-4">
							<div class="calendar-date text-center rounded bg-primary-lighten pa-2">
								<div class="text-caption text-uppercase">{{ formatMonth(event.startsAt) }}</div>
								<div class="text-h5 font-weight-bold">{{ formatDay(event.startsAt) }}</div>
							</div>

							<div class="flex-grow-1 min-width-0">
								<h3 class="text-h6 mb-1 text-truncate">{{ event.title }}</h3>
								<div class="text-body-2 text-medium-emphasis mb-1">
									<VIcon :icon="mdiClockOutline" size="16" class="mr-1" />
									{{ formatTimeRange(event.startsAt, event.endsAt) }}
								</div>
								<div v-if="event.location" class="text-body-2 text-medium-emphasis mb-1 text-truncate">
									<VIcon :icon="mdiLocationExit" size="16" class="mr-1" />
									{{ event.location }}
								</div>
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
						</VCardText>
					</VCard>
				</VCol>
			</VRow>
		</SvsLoading>
	</section>
</template>

<script setup lang="ts">
import { formatUtc } from "@/utils/date-time.utils";
import { useUpcomingCalendarEvents } from "@data-access";
import { mdiArrowRight, mdiCalendarOutline, mdiClockOutline, mdiLocationExit } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { events, eventsLoadingState } = useUpcomingCalendarEvents(6);

const formatMonth = (date: Date) => formatUtc(date, "date")?.split(".")[1] ?? "";
const formatDay = (date: Date) => formatUtc(date, "date")?.split(".")[0] ?? "";

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
	min-width: 64px;
}

.min-width-0 {
	min-width: 0;
}
</style>
