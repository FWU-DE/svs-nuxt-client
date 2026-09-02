import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { BoardApiFactory } from "@api-server";
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
	/** Where the entry came from; a board deadline is not an event of the calendar service. */
	source?: "board";
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

/**
 * Board deadlines that were marked for the calendar. They are not events of the calendar
 * service — the board keeps them — so they are fetched separately and merged in here.
 */
const fetchBoardDeadlines = async (): Promise<DashboardCalendarEvent[]> => {
	try {
		const api = BoardApiFactory(undefined, "/v3", $axios);
		const { data } = await api.boardControllerGetDeadlines();

		return data.data.map((deadline) => ({
			id: `board-deadline-${deadline.elementId}`,
			title: deadline.title || deadline.boardTitle,
			startsAt: new Date(deadline.dueDate),
			description: deadline.contextName ? `${deadline.boardTitle} · ${deadline.contextName}` : deadline.boardTitle,
			contextHref: `/boards/${deadline.boardId}`,
			source: "board" as const,
		}));
	} catch {
		return [];
	}
};

const fetchCalendarEvents = async (): Promise<DashboardCalendarEvent[]> => {
	const [serviceEvents, deadlines] = await Promise.all([
		(async () => {
			try {
				const { data } = await $axios.get<CalendarEventResponse[]>("/calendar", {
					params: {
						all: true,
					},
				});

				return data.map(mapEvent).filter((event): event is DashboardCalendarEvent => Boolean(event));
			} catch {
				return [];
			}
		})(),
		fetchBoardDeadlines(),
	]);

	return [...serviceEvents, ...deadlines].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
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
