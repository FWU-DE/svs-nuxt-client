import TaskEditPage from "./TaskEdit.page.vue";
import { LegacyTask, useLegacyHomeworkApi } from "@/composables/legacy-homework.api";
import { createTestEnvStore, mockApi, mockApiResponse } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { BoardElementResponseType, CourseRoomsApiInterface, CoursesApiInterface } from "@api-server";
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
	notifySuccess: vi.fn(),
	notifyError: vi.fn(),
}));

const COURSE = "0000dcfbfb5c7a3f00bf21ab";

const setup = async (path: string, existing?: Partial<LegacyTask>) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore({ SC_TITLE: "Test Cloud" });
	vi.mocked(useAppStore).mockReturnValue({ user: { id: "teacher" }, school: { id: "school" } } as unknown as ReturnType<
		typeof useAppStore
	>);
	const coursesApi = mockApi<CoursesApiInterface>();
	coursesApi.courseControllerFindForUser.mockResolvedValue(
		mockApiResponse({ data: { data: [{ id: COURSE, title: "Mathe" }], total: 1, skip: 0, limit: 100 } as never })
	);
	vi.spyOn(serverApi, "CoursesApiFactory").mockReturnValue(coursesApi);
	const courseRoomsApi = mockApi<CourseRoomsApiInterface>();
	courseRoomsApi.courseRoomsControllerGetRoomBoard.mockResolvedValue(
		mockApiResponse({
			data: {
				elements: [{ type: BoardElementResponseType.LESSON, content: { id: "lesson-1", name: "Thema 1" } }],
			} as never,
		})
	);
	vi.spyOn(serverApi, "CourseRoomsApiFactory").mockReturnValue(courseRoomsApi);

	const saved = { _id: "new-task" } as LegacyTask;
	const api = {
		getTask: vi.fn().mockResolvedValue({
			_id: "task-1",
			name: "Alt",
			teacherId: "teacher",
			courseId: { _id: COURSE, name: "Mathe", teacherIds: ["teacher"], userIds: [] },
			availableDate: "2026-01-01T08:00:00.000Z",
			archived: [],
			...existing,
		}),
		createTask: vi.fn().mockResolvedValue(saved),
		updateTask: vi.fn().mockResolvedValue({ _id: "task-1" }),
		deleteTask: vi.fn(),
		findSubmissions: vi.fn(),
		createSubmission: vi.fn(),
		updateSubmission: vi.fn(),
		deleteSubmission: vi.fn(),
		getCourseWithStudents: vi.fn(),
	};
	vi.mocked(useLegacyHomeworkApi).mockReturnValue(api);

	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{ path: "/homework/new", component: TaskEditPage },
			{ path: "/homework/:id/edit", component: TaskEditPage },
			{ path: "/:rest(.*)*", component: { template: "<div />" } },
		],
	});
	await router.push(path);
	await router.isReady();
	const wrapper = mount(TaskEditPage, {
		global: { plugins: [router, createTestingVuetify(), createTestingI18n()], stubs: ["ClassicEditor"] },
	});
	await flushPromises();
	return { wrapper, api, router };
};

describe("TaskEditPage", () => {
	it("creates a course task with ISO dates and goes to it", async () => {
		const { wrapper, api, router } = await setup(`/homework/new?course=${COURSE}`);

		await wrapper.get("[data-testid='task-edit-name'] input").setValue("Neue Aufgabe");
		await wrapper.get("[data-testid='task-edit-available-date'] input").setValue("2026-05-01T08:00");
		await wrapper.get("[data-testid='task-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createTask).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Neue Aufgabe",
				courseId: COURSE,
				private: false,
				availableDate: new Date("2026-05-01T08:00").toISOString(),
			})
		);
		await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/homework/new-task"));
	});

	it("keeps a task without course private", async () => {
		const { wrapper, api } = await setup("/homework/new");

		await wrapper.get("[data-testid='task-edit-name'] input").setValue("Für mich");
		await wrapper.get("[data-testid='task-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createTask).toHaveBeenCalledWith(
			expect.objectContaining({ courseId: null, private: true, publicSubmissions: false })
		);
	});

	it("does not save without a title", async () => {
		const { wrapper, api } = await setup("/homework/new");

		await wrapper.get("[data-testid='task-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createTask).not.toHaveBeenCalled();
	});

	it("loads an existing task and saves changes", async () => {
		const { wrapper, api } = await setup("/homework/task-1/edit");

		expect(wrapper.get<HTMLInputElement>("[data-testid='task-edit-name'] input").element.value).toBe("Alt");
		await wrapper.get("[data-testid='task-edit-name'] input").setValue("Neu");
		await wrapper.get("[data-testid='task-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.updateTask).toHaveBeenCalledWith("task-1", expect.objectContaining({ name: "Neu", courseId: COURSE }));
	});
});
