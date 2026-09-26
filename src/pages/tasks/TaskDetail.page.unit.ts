import TaskDetailPage from "./TaskDetail.page.vue";
import { LegacySubmission, LegacyTask, useLegacyHomeworkApi } from "@/composables/legacy-homework.api";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useAppStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@/composables/legacy-homework.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-homework.api")>()),
	useLegacyHomeworkApi: vi.fn(),
}));
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	useAppStore: vi.fn(),
}));

const TEACHER = "0000d231816abba584714c9e";
const STUDENT = "0000d224816abba584714c9c";
const COURSE = "0000dcfbfb5c7a3f00bf21ab";
const TASK = "59d1fae6395c8218f82cb914";

const buildTask = (overrides: Partial<LegacyTask> = {}): LegacyTask => ({
	_id: TASK,
	name: "Essay schreiben",
	description: "<p>Beschreibe deine These.</p>",
	schoolId: "school",
	teacherId: TEACHER,
	courseId: { _id: COURSE, name: "Deutsch", teacherIds: [TEACHER], substitutionIds: [], userIds: [STUDENT] },
	lessonId: null,
	availableDate: "2026-01-01T08:00:00.000Z",
	dueDate: "2300-01-02T10:00:00.000Z",
	archived: [],
	publicSubmissions: false,
	...overrides,
});

const submission: LegacySubmission = {
	_id: "sub-1",
	homeworkId: TASK,
	schoolId: "school",
	studentId: { _id: STUDENT, firstName: "Marla", lastName: "Mathe" },
	teamMembers: [{ _id: STUDENT, firstName: "Marla", lastName: "Mathe" }],
	comment: "<p>Meine Lösung</p>",
	submitted: true,
	graded: true,
	grade: 80,
	gradeComment: "<p>Gut</p>",
	createdAt: "2026-01-03T08:00:00.000Z",
	updatedAt: "2026-01-03T08:00:00.000Z",
};

const setup = async (options: { userId: string; task: LegacyTask; submissions?: LegacySubmission[] }) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore({ SC_TITLE: "Test Cloud" });
	vi.mocked(useAppStore).mockReturnValue({
		user: { id: options.userId },
		school: { id: "school" },
	} as unknown as ReturnType<typeof useAppStore>);
	const api = {
		getTask: vi.fn().mockResolvedValue(options.task),
		findSubmissions: vi.fn().mockResolvedValue(options.submissions ?? []),
		getCourseWithStudents: vi
			.fn()
			.mockResolvedValue({ _id: COURSE, userIds: [{ _id: STUDENT, firstName: "Marla", lastName: "Mathe" }] }),
		deleteTask: vi.fn().mockResolvedValue(undefined),
		updateTask: vi.fn().mockResolvedValue(options.task),
		createTask: vi.fn(),
		createSubmission: vi.fn(),
		updateSubmission: vi.fn(),
		deleteSubmission: vi.fn(),
	};
	vi.mocked(useLegacyHomeworkApi).mockReturnValue(api);

	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{ path: "/homework/:id", component: TaskDetailPage },
			{ path: "/tasks", component: { template: "<div />" } },
			{ path: "/:rest(.*)*", component: { template: "<div />" } },
		],
	});
	await router.push(`/homework/${TASK}`);
	await router.isReady();

	const wrapper = mount(TaskDetailPage, {
		attachTo: document.body,
		global: {
			plugins: [router, createTestingVuetify(), createTestingI18n()],
			stubs: ["RenderHTML", "TaskFiles", "ClassicEditor"],
		},
	});
	await flushPromises();
	return { wrapper, api, router };
};

describe("TaskDetailPage", () => {
	it("loads the task over the old API and shows course, title and description", async () => {
		const { wrapper, api } = await setup({ userId: TEACHER, task: buildTask({ isTeacher: true }) });

		expect(api.getTask).toHaveBeenCalledWith(TASK);
		expect(wrapper.get("[data-testid='task-detail-title']").text()).toBe("Deutsch - Essay schreiben");
		expect(wrapper.find("[data-testid='task-detail-description-html']").exists()).toBe(true);
	});

	it("links to the course room and the course files", async () => {
		const { wrapper } = await setup({ userId: TEACHER, task: buildTask({ isTeacher: true }) });

		expect(wrapper.get("[data-testid='task-detail-course']").attributes("href")).toBe(`/rooms/${COURSE}`);
		expect(wrapper.get("[data-testid='task-detail-course-files']").attributes("href")).toBe(`/files/courses/${COURSE}`);
	});

	it("gives teachers edit, delete and the submissions tab", async () => {
		const { wrapper } = await setup({
			userId: TEACHER,
			task: buildTask({ isTeacher: true }),
			submissions: [submission],
		});

		expect(wrapper.get("[data-testid='task-detail-edit']").attributes("href")).toBe(`/homework/${TASK}/edit`);
		expect(wrapper.find("[data-testid='task-detail-delete']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='task-detail-tab-submissions']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='task-detail-tab-submission']").exists()).toBe(false);
	});

	it("gives students the submission and feedback tabs but no edit", async () => {
		const { wrapper } = await setup({
			userId: STUDENT,
			task: buildTask({ isTeacher: false }),
			submissions: [submission],
		});

		expect(wrapper.find("[data-testid='task-detail-edit']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='task-detail-tab-submission']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='task-detail-tab-feedback']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='task-detail-tab-submissions']").exists()).toBe(false);
	});

	it("shows the other submissions to students when the task makes them public", async () => {
		const { wrapper } = await setup({
			userId: STUDENT,
			task: buildTask({ isTeacher: false, publicSubmissions: true }),
		});

		expect(wrapper.find("[data-testid='task-detail-tab-submissions']").exists()).toBe(true);
	});

	it("deletes the task through the v3 route and returns to the overview", async () => {
		const { wrapper, api, router } = await setup({ userId: TEACHER, task: buildTask({ isTeacher: true }) });

		await wrapper.get("[data-testid='task-detail-delete']").trigger("click");
		await flushPromises();
		const confirm = document.querySelector("[data-testid='task-delete-confirm']") as HTMLElement;
		confirm.click();
		await flushPromises();

		expect(api.deleteTask).toHaveBeenCalledWith(TASK);
		await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/tasks"));
	});

	it("archives the task for the current user only", async () => {
		const { wrapper, api } = await setup({
			userId: STUDENT,
			task: buildTask({ isTeacher: false, archived: ["someone-else"] }),
		});

		await wrapper.get("[data-testid='task-detail-archive']").trigger("click");
		await flushPromises();

		expect(api.updateTask).toHaveBeenCalledWith(TASK, { archived: ["someone-else", STUDENT] });
	});

	it("renders the missing state when the task cannot be loaded", async () => {
		setActivePinia(createTestingPinia());
		const { wrapper } = await setup({ userId: STUDENT, task: undefined as unknown as LegacyTask });

		expect(wrapper.find("[data-testid='task-detail-missing']").exists()).toBe(true);
	});
});
