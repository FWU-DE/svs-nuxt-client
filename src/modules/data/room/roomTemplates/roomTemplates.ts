import { RoomTemplate } from "./types";
import { MessageSchema } from "@/locales/schema";
import { BoardLayout, ContentElementType, RoomColor, RoomFeatures } from "@api-server";
import {
	mdiAccountGroupOutline,
	mdiCalendarOutline,
	mdiHumanMaleBoard,
	mdiLightbulbOnOutline,
	mdiPlusCircleOutline,
	mdiSchoolOutline,
	mdiViewDashboardOutline,
} from "@icons/material";

const richText = (textKey: keyof MessageSchema) => ({ type: ContentElementType.RICH_TEXT as const, textKey });

export const BLANK_ROOM_TEMPLATE_ID = "blank";

/**
 * Ready-made room structures offered on room creation. Every template is applied through the
 * regular board api, so everything it creates can be renamed, moved and deleted afterwards.
 */
export const roomTemplates: RoomTemplate[] = [
	{
		id: BLANK_ROOM_TEMPLATE_ID,
		icon: mdiPlusCircleOutline,
		titleKey: "pages.roomCreate.templates.blank.title",
		descriptionKey: "pages.roomCreate.templates.blank.description",
		color: RoomColor.BLUE_GREY,
		features: [],
		boards: [],
	},
	{
		id: "subject",
		icon: mdiSchoolOutline,
		titleKey: "pages.roomCreate.templates.subject.title",
		descriptionKey: "pages.roomCreate.templates.subject.description",
		roomNameKey: "pages.roomCreate.templates.subject.roomName",
		color: RoomColor.BLUE,
		features: [],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.subject.boards.overview",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.subject.columns.organisation",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.welcome.title",
								elements: [richText("pages.roomCreate.templates.subject.cards.welcome.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.subject.cards.rules.title",
								elements: [richText("pages.roomCreate.templates.subject.cards.rules.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.subject.columns.material",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.material.title",
								elements: [richText("pages.roomCreate.templates.subject.cards.material.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.subject.cards.links.title",
								elements: [],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.subject.columns.tasks",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.currentTask.title",
								elements: [richText("pages.roomCreate.templates.subject.cards.currentTask.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.subject.columns.dates",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.nextDates.title",
								elements: [richText("pages.roomCreate.templates.subject.cards.nextDates.text")],
							},
						],
					},
				],
			},
		],
	},
	{
		id: "weeklyPlan",
		icon: mdiCalendarOutline,
		titleKey: "pages.roomCreate.templates.weeklyPlan.title",
		descriptionKey: "pages.roomCreate.templates.weeklyPlan.description",
		roomNameKey: "pages.roomCreate.templates.weeklyPlan.roomName",
		color: RoomColor.GREEN,
		features: [],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.weeklyPlan.boards.week",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.thisWeek",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.goals.title",
								elements: [richText("pages.roomCreate.templates.weeklyPlan.cards.goals.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.tasks.title",
								elements: [richText("pages.roomCreate.templates.weeklyPlan.cards.tasks.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.nextWeek",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.preview.title",
								elements: [richText("pages.roomCreate.templates.weeklyPlan.cards.preview.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.help",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.help.title",
								elements: [richText("pages.roomCreate.templates.weeklyPlan.cards.help.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.done",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.archive.title",
								elements: [richText("pages.roomCreate.templates.weeklyPlan.cards.archive.text")],
							},
						],
					},
				],
			},
		],
	},
	{
		id: "project",
		icon: mdiViewDashboardOutline,
		titleKey: "pages.roomCreate.templates.project.title",
		descriptionKey: "pages.roomCreate.templates.project.description",
		roomNameKey: "pages.roomCreate.templates.project.roomName",
		color: RoomColor.ORANGE,
		features: [RoomFeatures.EDITOR_MANAGE_VIDEOCONFERENCE],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.project.boards.project",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.project.columns.briefing",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.project.cards.goal.title",
								elements: [richText("pages.roomCreate.templates.project.cards.goal.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.project.cards.team.title",
								elements: [richText("pages.roomCreate.templates.project.cards.team.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.project.cards.schedule.title",
								elements: [richText("pages.roomCreate.templates.project.cards.schedule.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.project.columns.todo",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.project.cards.example.title",
								elements: [richText("pages.roomCreate.templates.project.cards.example.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.project.columns.doing",
						cards: [],
					},
					{
						titleKey: "pages.roomCreate.templates.project.columns.done",
						cards: [],
					},
					{
						titleKey: "pages.roomCreate.templates.project.columns.results",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.project.cards.presentation.title",
								elements: [richText("pages.roomCreate.templates.project.cards.presentation.text")],
							},
						],
					},
				],
			},
		],
	},
	{
		id: "classroom",
		icon: mdiAccountGroupOutline,
		titleKey: "pages.roomCreate.templates.classroom.title",
		descriptionKey: "pages.roomCreate.templates.classroom.description",
		roomNameKey: "pages.roomCreate.templates.classroom.roomName",
		color: RoomColor.TURQUOISE,
		features: [],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.classroom.boards.news",
				layout: BoardLayout.LIST,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.announcements",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.welcome.title",
								elements: [richText("pages.roomCreate.templates.classroom.cards.welcome.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.thisWeek.title",
								elements: [richText("pages.roomCreate.templates.classroom.cards.thisWeek.text")],
							},
						],
					},
				],
			},
			{
				titleKey: "pages.roomCreate.templates.classroom.boards.organisation",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.duties",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.dutyPlan.title",
								elements: [richText("pages.roomCreate.templates.classroom.cards.dutyPlan.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.rules",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.classRules.title",
								elements: [richText("pages.roomCreate.templates.classroom.cards.classRules.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.dates",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.nextDates.title",
								elements: [],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.parents",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.parentInfo.title",
								elements: [richText("pages.roomCreate.templates.classroom.cards.parentInfo.text")],
							},
						],
					},
				],
			},
		],
	},
	{
		id: "team",
		icon: mdiHumanMaleBoard,
		titleKey: "pages.roomCreate.templates.team.title",
		descriptionKey: "pages.roomCreate.templates.team.description",
		roomNameKey: "pages.roomCreate.templates.team.roomName",
		color: RoomColor.PURPLE,
		features: [RoomFeatures.EDITOR_MANAGE_VIDEOCONFERENCE],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.team.boards.team",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.team.columns.announcements",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.latest.title",
								elements: [richText("pages.roomCreate.templates.team.cards.latest.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.team.columns.material",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.curriculum.title",
								elements: [richText("pages.roomCreate.templates.team.cards.curriculum.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.team.columns.minutes",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.lastMeeting.title",
								elements: [richText("pages.roomCreate.templates.team.cards.lastMeeting.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.team.columns.tasks",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.responsibilities.title",
								elements: [richText("pages.roomCreate.templates.team.cards.responsibilities.text")],
							},
						],
					},
				],
			},
		],
	},
	{
		id: "selfStudy",
		icon: mdiLightbulbOnOutline,
		titleKey: "pages.roomCreate.templates.selfStudy.title",
		descriptionKey: "pages.roomCreate.templates.selfStudy.description",
		roomNameKey: "pages.roomCreate.templates.selfStudy.roomName",
		color: RoomColor.LIGHT_BLUE,
		features: [],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.selfStudy.boards.path",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.intro",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.hook.title",
								elements: [richText("pages.roomCreate.templates.selfStudy.cards.hook.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.learn",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.input.title",
								elements: [richText("pages.roomCreate.templates.selfStudy.cards.input.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.practice",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.exercises.title",
								elements: [richText("pages.roomCreate.templates.selfStudy.cards.exercises.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.secure",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.check.title",
								elements: [richText("pages.roomCreate.templates.selfStudy.cards.check.text")],
							},
						],
					},
				],
			},
		],
	},
];

export const getRoomTemplateById = (id?: string): RoomTemplate | undefined =>
	roomTemplates.find((template) => template.id === id);
