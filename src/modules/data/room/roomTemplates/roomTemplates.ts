import { RoomTemplate, RoomTemplateElement } from "./types";
import { MessageSchema } from "@/locales/schema";
import { BoardLayout, Colors, RoomColor, RoomFeatures } from "@api-server";
import {
	mdiAccountGroupOutline,
	mdiCalendarOutline,
	mdiHumanMaleBoard,
	mdiLightbulbOnOutline,
	mdiPlusCircleOutline,
	mdiSchoolOutline,
	mdiViewDashboardOutline,
} from "@icons/material";

const text = (textKey: keyof MessageSchema): RoomTemplateElement => ({ kind: "text", textKey });
const folder = (titleKey: keyof MessageSchema): RoomTemplateElement => ({ kind: "folder", titleKey });
const boardLink = (titleKey: keyof MessageSchema, boardIndex: number): RoomTemplateElement => ({
	kind: "boardLink",
	titleKey,
	boardIndex,
});
const drawing = (): RoomTemplateElement => ({ kind: "drawing" });
const collaborative = (): RoomTemplateElement => ({ kind: "collaborative" });
const videoConference = (titleKey: keyof MessageSchema): RoomTemplateElement => ({ kind: "videoConference", titleKey });

export const BLANK_ROOM_TEMPLATE_ID = "blank";

/**
 * Ready-made room structures offered on room creation. Every template is applied through the
 * regular board api, so everything it creates can be renamed, moved and deleted afterwards.
 *
 * Texts may contain `{placeholders}` of the template params. Columns and cards with a
 * `repeatParam` are created as often as that number param says, counting `{index}` from 1.
 * A `boardLink` points at another board of the same template by its position.
 */
export const roomTemplates: RoomTemplate[] = [
	{
		id: BLANK_ROOM_TEMPLATE_ID,
		icon: mdiPlusCircleOutline,
		titleKey: "pages.roomCreate.templates.blank.title",
		descriptionKey: "pages.roomCreate.templates.blank.description",
		color: RoomColor.BLUE_GREY,
		features: [],
		params: [],
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
		params: [
			{
				key: "subject",
				labelKey: "pages.roomCreate.templates.params.subject",
				type: "text",
				defaultValue: "Mathematik",
			},
			{ key: "grade", labelKey: "pages.roomCreate.templates.params.grade", type: "text", defaultValue: "9b" },
		],
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
								color: Colors.BLUE,
								elements: [text("pages.roomCreate.templates.subject.cards.welcome.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.subject.cards.rules.title",
								color: Colors.BLUE,
								elements: [text("pages.roomCreate.templates.subject.cards.rules.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.subject.columns.material",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.material.title",
								color: Colors.TEAL,
								elements: [
									text("pages.roomCreate.templates.subject.cards.material.text"),
									folder("pages.roomCreate.templates.folder.material"),
								],
							},
							{
								titleKey: "pages.roomCreate.templates.subject.cards.links.title",
								color: Colors.TEAL,
								elements: [text("pages.roomCreate.templates.subject.cards.links.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.subject.columns.tasks",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.currentTask.title",
								color: Colors.RED,
								elements: [text("pages.roomCreate.templates.subject.cards.currentTask.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.subject.columns.dates",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.subject.cards.nextDates.title",
								color: Colors.AMBER,
								elements: [text("pages.roomCreate.templates.subject.cards.nextDates.text")],
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
		params: [
			{
				key: "subject",
				labelKey: "pages.roomCreate.templates.params.subject",
				type: "text",
				defaultValue: "Mathematik",
			},
			{
				key: "weeks",
				labelKey: "pages.roomCreate.templates.params.weeks",
				type: "number",
				defaultValue: 4,
				min: 1,
				max: 12,
			},
		],
		boards: [
			{
				titleKey: "pages.roomCreate.templates.weeklyPlan.boards.week",
				layout: BoardLayout.COLUMNS,
				columns: [
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.week",
						repeatParam: "weeks",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.goals.title",
								color: Colors.TEAL,
								elements: [text("pages.roomCreate.templates.weeklyPlan.cards.goals.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.tasks.title",
								color: Colors.RED,
								elements: [text("pages.roomCreate.templates.weeklyPlan.cards.tasks.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.help",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.help.title",
								color: Colors.BLUE,
								elements: [
									text("pages.roomCreate.templates.weeklyPlan.cards.help.text"),
									folder("pages.roomCreate.templates.folder.material"),
								],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.weeklyPlan.columns.done",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.weeklyPlan.cards.archive.title",
								color: Colors.GREY,
								elements: [text("pages.roomCreate.templates.weeklyPlan.cards.archive.text")],
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
		params: [
			{
				key: "projectName",
				labelKey: "pages.roomCreate.templates.params.projectName",
				type: "text",
				defaultValue: "Projektwoche",
			},
			{
				key: "groups",
				labelKey: "pages.roomCreate.templates.params.groups",
				type: "number",
				defaultValue: 4,
				min: 1,
				max: 12,
			},
		],
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
								color: Colors.BLUE,
								elements: [text("pages.roomCreate.templates.project.cards.goal.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.project.cards.team.title",
								color: Colors.BLUE,
								elements: [text("pages.roomCreate.templates.project.cards.team.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.project.cards.schedule.title",
								color: Colors.BLUE,
								elements: [text("pages.roomCreate.templates.project.cards.schedule.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.project.cards.ideas.title",
								color: Colors.AMBER,
								elements: [text("pages.roomCreate.templates.project.cards.ideas.text"), drawing()],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.project.columns.todo",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.project.cards.group.title",
								repeatParam: "groups",
								color: Colors.TEAL,
								elements: [text("pages.roomCreate.templates.project.cards.group.text"), collaborative()],
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
								color: Colors.GREEN,
								elements: [
									text("pages.roomCreate.templates.project.cards.presentation.text"),
									folder("pages.roomCreate.templates.folder.results"),
								],
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
		params: [
			{
				key: "className",
				labelKey: "pages.roomCreate.templates.params.className",
				type: "text",
				defaultValue: "7a",
			},
		],
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
								color: Colors.AMBER,
								elements: [text("pages.roomCreate.templates.classroom.cards.welcome.text")],
							},
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.thisWeek.title",
								color: Colors.AMBER,
								elements: [text("pages.roomCreate.templates.classroom.cards.thisWeek.text")],
							},
							{
								// the two boards of this room point at each other
								titleKey: "pages.roomCreate.templates.classroom.cards.toOrganisation.title",
								elements: [boardLink("pages.roomCreate.templates.classroom.boards.organisation", 1)],
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
								color: Colors.TEAL,
								elements: [text("pages.roomCreate.templates.classroom.cards.dutyPlan.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.rules",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.classRules.title",
								color: Colors.BLUE,
								elements: [text("pages.roomCreate.templates.classroom.cards.classRules.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.dates",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.nextDates.title",
								color: Colors.AMBER,
								elements: [boardLink("pages.roomCreate.templates.classroom.boards.news", 0)],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.classroom.columns.parents",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.classroom.cards.parentInfo.title",
								color: Colors.PURPLE,
								elements: [
									text("pages.roomCreate.templates.classroom.cards.parentInfo.text"),
									folder("pages.roomCreate.templates.folder.parents"),
								],
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
		params: [
			{
				key: "subject",
				labelKey: "pages.roomCreate.templates.params.subject",
				type: "text",
				defaultValue: "Mathematik",
			},
		],
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
								color: Colors.AMBER,
								elements: [
									text("pages.roomCreate.templates.team.cards.latest.text"),
									videoConference("pages.roomCreate.templates.team.cards.latest.conference"),
								],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.team.columns.material",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.curriculum.title",
								color: Colors.BLUE,
								elements: [
									text("pages.roomCreate.templates.team.cards.curriculum.text"),
									folder("pages.roomCreate.templates.folder.material"),
								],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.team.columns.minutes",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.lastMeeting.title",
								color: Colors.GREY,
								elements: [
									text("pages.roomCreate.templates.team.cards.lastMeeting.text"),
									collaborative(),
									folder("pages.roomCreate.templates.folder.minutes"),
								],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.team.columns.tasks",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.team.cards.responsibilities.title",
								color: Colors.TEAL,
								elements: [text("pages.roomCreate.templates.team.cards.responsibilities.text")],
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
		params: [
			{
				key: "topic",
				labelKey: "pages.roomCreate.templates.params.topic",
				type: "text",
				defaultValue: "Bruchrechnung",
			},
		],
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
								color: Colors.AMBER,
								elements: [text("pages.roomCreate.templates.selfStudy.cards.hook.text")],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.learn",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.input.title",
								color: Colors.BLUE,
								elements: [
									text("pages.roomCreate.templates.selfStudy.cards.input.text"),
									folder("pages.roomCreate.templates.folder.material"),
								],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.practice",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.exercises.title",
								color: Colors.TEAL,
								elements: [text("pages.roomCreate.templates.selfStudy.cards.exercises.text"), collaborative()],
							},
						],
					},
					{
						titleKey: "pages.roomCreate.templates.selfStudy.columns.secure",
						cards: [
							{
								titleKey: "pages.roomCreate.templates.selfStudy.cards.check.title",
								color: Colors.GREEN,
								elements: [text("pages.roomCreate.templates.selfStudy.cards.check.text"), drawing()],
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
