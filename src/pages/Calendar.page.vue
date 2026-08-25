<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<div class="d-flex align-center justify-space-between flex-wrap ga-4">
				<div>
					<h1 data-testid="calendar-title">{{ t("pages.calendar.title") }}</h1>
					<p class="text-medium-emphasis mb-0">{{ t("pages.calendar.subtitle") }}</p>
				</div>
				<VBtn variant="outlined" :prepend-icon="mdiReload" data-testid="calendar-refresh" @click="reloadEvents">
					{{ t("common.actions.update") }}
				</VBtn>
			</div>
		</template>

		<SvsLoading :loading-state="eventsLoadingState">
			<VAlert v-if="events.length === 0" type="info" variant="tonal" data-testid="calendar-empty">
				{{ t("pages.calendar.empty") }}
			</VAlert>

			<div v-else class="d-flex flex-column ga-4" data-testid="calendar-event-list">
				<VCard
					v-for="event in groupedEvents.today"
					:key="event.id"
					variant="outlined"
					data-testid="calendar-event-today"
				>
					<VCardText>
						<CalendarEventRow :event="event" :date-label="t('pages.calendar.today')" />
					</VCardText>
				</VCard>

				<VCard
					v-for="event in groupedEvents.upcoming"
					:key="event.id"
					variant="outlined"
					data-testid="calendar-event-upcoming"
				>
					<VCardText>
						<CalendarEventRow :event="event" :date-label="formatDate(event.startsAt)" />
					</VCardText>
				</VCard>

				<VExpansionPanels v-if="groupedEvents.past.length > 0" variant="accordion" data-testid="calendar-past-events">
					<VExpansionPanel>
						<VExpansionPanelTitle>{{ t("pages.calendar.past") }}</VExpansionPanelTitle>
						<VExpansionPanelText>
							<div class="d-flex flex-column ga-3">
								<CalendarEventRow
									v-for="event in groupedEvents.past"
									:key="event.id"
									:event="event"
									:date-label="formatDate(event.startsAt)"
								/>
							</div>
						</VExpansionPanelText>
					</VExpansionPanel>
				</VExpansionPanels>
			</div>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import CalendarEventRow from "@/pages/calendar/CalendarEventRow.vue";
import { formatUtc, isToday } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { useCalendarEvents } from "@data-access";
import { mdiReload } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { events, eventsLoadingState, reloadEvents } = useCalendarEvents();

useTitle(buildPageTitle(t("pages.calendar.title")));

const groupedEvents = computed(() => {
	const now = Date.now();
	const today = events.value.filter((event) => isToday(event.startsAt));
	const upcoming = events.value.filter((event) => !isToday(event.startsAt) && event.startsAt.getTime() >= now);
	const past = events.value.filter((event) => !isToday(event.startsAt) && event.startsAt.getTime() < now).reverse();

	return { today, upcoming, past };
});

const formatDate = (date: Date) => formatUtc(date, "date") ?? "";
</script>
