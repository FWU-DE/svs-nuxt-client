import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { computed } from "vue";

export interface CalendarEventResponse {
	_id?: string;
	id?: string;
	title?: string;
	summary?: string;
	start?: number | string;
	end?: number | string;
	location?: string;
	description?: string;
	"x-sc-courseId"?: string;
	"x-sc-teamId"?: string;
}

export interface DashboardCalendarEvent {
	id: string;
	title: string;
	startsAt: Date;
	endsAt?: Date;
	location?: string;
	description?: string;
	contextHref?: string;
	contextType?: "course" | "team";
}

const parseDate = (value?: number | string): Date | undefined => {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

const getContext = (event: CalendarEventResponse): Pick<DashboardCalendarEvent, "contextHref" | "contextType"> => {
	if (event["x-sc-courseId"]) {
		return {
			contextHref: `/courses/${event["x-sc-courseId"]}`,
			contextType: "course",
		};
	}

	if (event["x-sc-teamId"]) {
		return {
			contextHref: `/teams/${event["x-sc-teamId"]}?activeTab=events`,
			contextType: "team",
		};
	}

	return {};
};

const mapEvent = (event: CalendarEventResponse): DashboardCalendarEvent | undefined => {
	const startsAt = parseDate(event.start);
	if (!startsAt) return undefined;

	return {
		id: event._id ?? event.id ?? `${event.title ?? event.summary}-${startsAt.toISOString()}`,
		title: event.title ?? event.summary ?? "Calendar event",
		startsAt,
		endsAt: parseDate(event.end),
		location: event.location,
		description: event.description,
		...getContext(event),
	};
};

const fetchCalendarEvents = async (): Promise<DashboardCalendarEvent[]> => {
	try {
		const { data } = await $axios.get<CalendarEventResponse[]>("/calendar", {
			params: {
				all: true,
			},
		});

		return data
			.map(mapEvent)
			.filter((event): event is DashboardCalendarEvent => Boolean(event))
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
	} catch {
		return [];
	}
};

export const useCalendarEvents = () => {
	const { data, loadingState, execute } = useSafeAxiosRunner(fetchCalendarEvents);
	const events = computed(() => data.value ?? []);

	return { events, eventsLoadingState: loadingState, reloadEvents: execute };
};

export const useUpcomingCalendarEvents = (limit = 5) => {
	const { data, loadingState, execute } = useSafeAxiosRunner(async () => {
		const now = Date.now();
		const events = await fetchCalendarEvents();

		return events.filter((event) => event.startsAt.getTime() >= now).slice(0, limit);
	});

	const events = computed(() => data.value ?? []);

	return { events, eventsLoadingState: loadingState, reloadEvents: execute };
};
