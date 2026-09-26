import TaskSubmissionForm from "./TaskSubmissionForm.vue";
import TaskSubmissionsTable from "./TaskSubmissionsTable.vue";
import { LegacySubmission, LegacyTask, useLegacyHomeworkApi } from "@/composables/legacy-homework.api";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { notifyError } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosError, AxiosHeaders } from "axios";
import { setActivePinia } from "pinia";

vi.mock("@/composables/legacy-homework.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-homework.api")>()),
	useLegacyHomeworkApi: vi.fn(),
}));
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	notifySuccess: vi.fn(),
	notifyError: vi.fn(),
}));

const task = {
	_id: "task-1",
	name: "Aufgabe",
	teacherId: "teacher",
	courseId: null,
	availableDate: "2026-01-01T08:00:00.000Z",
	archived: [],
	teamSubmissions: false,
} as unknown as LegacyTask;

const submission: LegacySubmission = {
	_id: "sub-1",
	homeworkId: "task-1",
	schoolId: "school",
	studentId: { _id: "student", firstName: "Marla", lastName: "Mathe" },
	teamMembers: [{ _id: "student", firstName: "Marla", lastName: "Mathe" }],
	comment: "<p>Alt</p>",
	submitted: false,
	graded: false,
	createdAt: "",
	updatedAt: "",
};

const mockApi = () => {
	const api = {
		createSubmission: vi.fn().mockResolvedValue(submission),
		updateSubmission: vi.fn().mockResolvedValue(submission),
		getTask: vi.fn(),
		createTask: vi.fn(),
		updateTask: vi.fn(),
		deleteTask: vi.fn(),
		findSubmissions: vi.fn(),
		deleteSubmission: vi.fn(),
		getCourseWithStudents: vi.fn(),
	};
	vi.mocked(useLegacyHomeworkApi).mockReturnValue(api);
	return api;
};

const plugins = () => [createTestingVuetify(), createTestingI18n()];

describe("TaskSubmissionForm", () => {
	beforeEach(() => setActivePinia(createTestingPinia()));

	it("creates the first submission with school, student and submitted flag", async () => {
		const api = mockApi();
		const wrapper = mount(TaskSubmissionForm, {
			props: { task, students: [], currentUserId: "student", schoolId: "school" },
			global: { plugins: plugins(), stubs: ["ClassicEditor", "TaskFiles"] },
		});

		await wrapper.get("[data-testid='task-submission-submit']").trigger("click");
		await flushPromises();

		expect(api.createSubmission).toHaveBeenCalledWith(
			expect.objectContaining({ homeworkId: "task-1", schoolId: "school", studentId: "student", submitted: true })
		);
		expect(wrapper.emitted("saved")).toHaveLength(1);
	});

	it("updates an existing draft", async () => {
		const api = mockApi();
		const wrapper = mount(TaskSubmissionForm, {
			props: { task, submission, students: [], currentUserId: "student", schoolId: "school" },
			global: { plugins: plugins(), stubs: ["ClassicEditor", "TaskFiles"] },
		});

		await wrapper.get("[data-testid='task-submission-save-draft']").trigger("click");
		await flushPromises();

		expect(api.updateSubmission).toHaveBeenCalledWith(
			"sub-1",
			expect.objectContaining({ comment: "<p>Alt</p>", submitted: false })
		);
	});

	it("shows the server's reason when the submission is refused", async () => {
		const api = mockApi();
		const refusal = new AxiosError("Conflict", "409", undefined, undefined, {
			status: 409,
			statusText: "Conflict",
			headers: {},
			config: { headers: new AxiosHeaders() },
			data: { message: "Die Aufgabe wurde bereits abgegeben!" },
		});
		api.createSubmission.mockRejectedValue(refusal);
		const wrapper = mount(TaskSubmissionForm, {
			props: { task, students: [], currentUserId: "student", schoolId: "school" },
			global: { plugins: plugins(), stubs: ["ClassicEditor", "TaskFiles"] },
		});

		await wrapper.get("[data-testid='task-submission-submit']").trigger("click");
		await flushPromises();

		expect(notifyError).toHaveBeenCalledWith("Die Aufgabe wurde bereits abgegeben!");
	});
});

describe("TaskSubmissionsTable", () => {
	beforeEach(() => setActivePinia(createTestingPinia()));

	it("lists submissions and the students without one", () => {
		mockApi();
		const wrapper = mount(TaskSubmissionsTable, {
			props: {
				submissions: [submission],
				students: [
					{ _id: "student", firstName: "Marla", lastName: "Mathe" },
					{ _id: "other", firstName: "Otto", lastName: "Offen" },
				],
				canGrade: true,
			},
			global: { plugins: plugins(), stubs: ["ClassicEditor", "TaskFiles", "RenderHTML"] },
		});

		expect(wrapper.get("[data-testid='task-submission-row-sub-1']").text()).toContain("Marla Mathe");
		expect(wrapper.get("[data-testid='task-submissions-missing']").text()).toContain("Otto Offen");
	});

	it("grades a submission", async () => {
		const api = mockApi();
		const wrapper = mount(TaskSubmissionsTable, {
			props: { submissions: [submission], students: [], canGrade: true },
			global: { plugins: plugins(), stubs: ["ClassicEditor", "TaskFiles", "RenderHTML"] },
		});

		await wrapper.get("[data-testid='task-submission-toggle-sub-1']").trigger("click");
		await wrapper.get("[data-testid='task-grading-grade'] input").setValue("85");
		await wrapper.get("[data-testid='task-grading-save']").trigger("click");
		await flushPromises();

		expect(api.updateSubmission).toHaveBeenCalledWith("sub-1", expect.objectContaining({ grade: 85, graded: true }));
		expect(wrapper.emitted("graded")).toHaveLength(1);
	});

	it("shows submissions read-only to students", async () => {
		mockApi();
		const wrapper = mount(TaskSubmissionsTable, {
			props: { submissions: [submission], students: [], canGrade: false },
			global: { plugins: plugins(), stubs: ["ClassicEditor", "TaskFiles", "RenderHTML"] },
		});

		await wrapper.get("[data-testid='task-submission-toggle-sub-1']").trigger("click");

		expect(wrapper.find("[data-testid='task-grading-save']").exists()).toBe(false);
	});
});
