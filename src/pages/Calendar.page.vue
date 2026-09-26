<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="calendar-title">{{ t("pages.calendar.title") }}</h1>
		</template>

		<div class="d-flex align-center justify-space-between flex-wrap ga-4 mb-4">
			<h2 class="calendar-range mb-0" data-testid="calendar-range">{{ rangeTitle }}</h2>
			<div class="d-flex ga-2">
				<VBtnGroup variant="outlined" density="compact" divided>
					<VBtn :icon="mdiChevronLeft" :aria-label="t('pages.calendar.previous')" data-testid="calendar-prev" @click="move(-1)" />
					<VBtn
						v-for="mode in viewModes"
						:key="mode"
						:active="viewMode === mode"
						:data-testid="`calendar-view-${mode}`"
						@click="viewMode = mode"
					>
						{{ t(`pages.calendar.view.${mode}`) }}
					</VBtn>
					<VBtn :icon="mdiChevronRight" :aria-label="t('pages.calendar.next')" data-testid="calendar-next" @click="move(1)" />
				</VBtnGroup>
				<VBtn variant="outlined" density="compact" data-testid="calendar-today" @click="cursor = startOfDay(new Date())">
					{{ t("pages.calendar.today") }}
				</VBtn>
			</div>
		</div>

		<SvsLoading :loading-state="eventsLoadingState">
			<div class="calendar-grid" :class="`calendar-grid--${viewMode}`" data-testid="calendar-grid">
				<div v-for="day in weekdayHeaders" :key="day" class="calendar-weekday">{{ day }}</div>
				<div
					v-for="day in visibleDays"
					:key="day.key"
					class="calendar-day"
					:class="{ 'calendar-day--outside': day.outside, 'calendar-day--today': day.today }"
					:data-testid="`calendar-day-${day.key}`"
				>
					<div class="calendar-day-number">{{ day.date.getDate() }}</div>
					<button
						v-for="event in day.events"
						:key="event.id"
						type="button"
						class="calendar-event text-truncate"
						data-testid="calendar-event"
						@click="selectedEvent = event"
					>
						<span class="font-weight-bold mr-1">{{ formatUtc(event.startsAt, "time") }}</span>{{ event.title }}
					</button>
				</div>
			</div>
		</SvsLoading>

		<VDialog :model-value="!!selectedEvent" max-width="560" @update:model-value="selectedEvent = undefined">
			<VCard v-if="selectedEvent" data-testid="calendar-event-dialog">
				<VCardText>
					<CalendarEventRow :event="selectedEvent" :date-label="formatUtc(selectedEvent.startsAt, 'date') ?? ''" />
				</VCardText>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import CalendarEventRow from "@/pages/calendar/CalendarEventRow.vue";
import { formatUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { DashboardCalendarEvent, useCalendarEvents } from "@data-access";
import { mdiChevronLeft, mdiChevronRight } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

type ViewMode = "day" | "week" | "month";

const { t, locale } = useI18n();
const { events, eventsLoadingState } = useCalendarEvents();

useTitle(buildPageTitle(t("pages.calendar.title")));

// Same controls and default as the legacy FullCalendar page: month view, weeks start on Monday.
const viewModes: ViewMode[] = ["day", "week", "month"];
const viewMode = ref<ViewMode>("month");
const selectedEvent = ref<DashboardCalendarEvent>();

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
const dayKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const cursor = ref(startOfDay(new Date()));

const move = (direction: number) => {
	const c = cursor.value;
	if (viewMode.value === "month") cursor.value = new Date(c.getFullYear(), c.getMonth() + direction, 1);
	else cursor.value = addDays(c, direction * (viewMode.value === "week" ? 7 : 1));
};

const rangeDays = computed(() => {
	const c = cursor.value;
	if (viewMode.value === "day") return [c];
	if (viewMode.value === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(c), i));
	const first = startOfWeek(new Date(c.getFullYear(), c.getMonth(), 1));
	return Array.from({ length: 42 }, (_, i) => addDays(first, i));
});

const eventsByDay = computed(() => {
	const map = new Map<string, DashboardCalendarEvent[]>();
	[...events.value]
		.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
		.forEach((event) => {
			const key = dayKey(event.startsAt);
			map.set(key, [...(map.get(key) ?? []), event]);
		});
	return map;
});

const visibleDays = computed(() => {
	const todayKey = dayKey(new Date());
	return rangeDays.value.map((date) => ({
		date,
		key: dayKey(date),
		outside: viewMode.value === "month" && date.getMonth() !== cursor.value.getMonth(),
		today: dayKey(date) === todayKey,
		events: eventsByDay.value.get(dayKey(date)) ?? [],
	}));
});

const weekdayHeaders = computed(() => {
	const format = new Intl.DateTimeFormat(locale.value, { weekday: "short" });
	const days = viewMode.value === "day" ? rangeDays.value : rangeDays.value.slice(0, 7);
	return days.map((date) => format.format(date).replace(/\.$/, ""));
});

const rangeTitle = computed(() => {
	const c = cursor.value;
	if (viewMode.value === "month") {
		return new Intl.DateTimeFormat(locale.value, { month: "long", year: "numeric" }).format(c);
	}
	const long = new Intl.DateTimeFormat(locale.value, { day: "numeric", month: "long", year: "numeric" });
	if (viewMode.value === "day") return long.format(c);
	const days = rangeDays.value;
	return `${new Intl.DateTimeFormat(locale.value, { day: "numeric", month: "short" }).format(days[0])} – ${long.format(days[6])}`;
});
</script>

<style lang="scss" scoped>
// Modelled on the legacy FullCalendar month view: bordered grid, day number top right,
// muted days outside the month and a pale highlight for today.
.calendar-range {
	font-size: 2rem;
	font-weight: 400;
}

.calendar-grid {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.calendar-grid--day {
	grid-template-columns: minmax(0, 1fr);
}

.calendar-weekday,
.calendar-day {
	border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.calendar-weekday {
	text-align: center;
	font-weight: bold;
	padding: 2px 4px;
}

.calendar-day {
	min-height: 132px;
	padding: 2px 4px 4px;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.calendar-grid--week .calendar-day,
.calendar-grid--day .calendar-day {
	min-height: 480px;
}

.calendar-day-number {
	text-align: right;
}

.calendar-day--outside .calendar-day-number {
	opacity: 0.35;
}

.calendar-day--today {
	background-color: #fcf8e3;
}

.calendar-event {
	display: block;
	width: 100%;
	text-align: left;
	font-size: 0.85rem;
	padding: 1px 4px;
	border-radius: 3px;
	color: rgb(var(--v-theme-on-primary));
	background-color: rgb(var(--v-theme-primary));
}
</style>
