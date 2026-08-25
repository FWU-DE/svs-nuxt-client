import TaskDetailPage from "./TaskDetail.page.vue";
import { createTestEnvStore, mockApi, mockApiResponse, taskResponseFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import {
	RichTextType,
	SubmissionApiInterface,
	SubmissionStatusListResponse,
	TaskApiInterface,
	TaskListResponse,
} from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";
import { createRouter, createWebHistory } from "vue-router";

describe("TaskDetailPage", () => {
	let taskApi: Mocked<TaskApiInterface>;
	let submissionApi: Mocked<SubmissionApiInterface>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		taskApi = mockApi<TaskApiInterface>();
		submissionApi = mockApi<SubmissionApiInterface>();
		vi.spyOn(serverApi, "TaskApiFactory").mockReturnValue(taskApi);
		vi.spyOn(serverApi, "SubmissionApiFactory").mockReturnValue(submissionApi);
	});

	const createTask = (taskId = "507f1f77bcf86cd799439011") =>
		taskResponseFactory.build({
			id: taskId,
			name: "Essay schreiben",
			courseName: "Deutsch",
			lessonName: "Argumentation",
			dueDate: "2026-01-02T10:00:00.000Z",
			description: { type: RichTextType.PLAIN_TEXT, content: "Beschreibe deine These." },
			status: {
				submitted: 3,
				maxSubmissions: 10,
				graded: 2,
				isDraft: false,
				isSubstitutionTeacher: false,
				isFinished: false,
			},
		});

	const setup = async (taskId = "507f1f77bcf86cd799439011", tasks = [createTask(taskId)]) => {
		taskApi.taskControllerFindAll.mockResolvedValue(
			mockApiResponse<TaskListResponse>({ data: { data: tasks, total: tasks.length, skip: 0, limit: 1000 } })
		);
		submissionApi.submissionControllerFindStatusesByTask.mockResolvedValue(
			mockApiResponse<SubmissionStatusListResponse>({
				data: {
					data: [{ id: "submission-1", submitters: ["Ada Lovelace"], isSubmitted: true, isGraded: true, grade: 2 }],
				},
			})
		);
		const router = createRouter({
			history: createWebHistory(),
			routes: [{ path: "/homework/:id", component: TaskDetailPage }],
		});
		await router.push(`/homework/${taskId}`);
		await router.isReady();

		const wrapper = mount(TaskDetailPage, {
			global: {
				plugins: [router, createTestingVuetify(), createTestingI18n()],
				stubs: ["RenderHTML"],
			},
		});
		await flushPromises();
		return { wrapper, task: tasks[0] };
	};

	it("renders task details", async () => {
		const { wrapper } = await setup();

		expect(taskApi.taskControllerFindAll).toHaveBeenCalledWith(0, 1000);
		expect(wrapper.get("[data-testid='task-detail-title']").text()).toContain("Essay schreiben");
		expect(wrapper.get("[data-testid='task-detail-course']").text()).toContain("Deutsch");
		expect(wrapper.get("[data-testid='task-detail-description-text']").text()).toContain("Beschreibe deine These.");
		expect(wrapper.get("[data-testid='task-detail-submitted']").text()).toBe("3");
		expect(submissionApi.submissionControllerFindStatusesByTask).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
		expect(wrapper.get("[data-testid='submission-status-submission-1']").text()).toContain("Ada Lovelace");
	});

	it("renders missing state for unknown task", async () => {
		const { wrapper } = await setup("507f1f77bcf86cd799439012", []);

		expect(wrapper.find("[data-testid='task-detail-missing']").exists()).toBe(true);
	});
});
