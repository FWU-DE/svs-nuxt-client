import CourseEditPage from "./CourseEdit.page.vue";
import { useLegacyCourseApi } from "@/composables/legacy-course.api";
import { useLegacySchoolPeopleApi } from "@/composables/legacy-school-people.api";
import * as utils from "@/utils/api";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useAppStore, useSchoolStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@/composables/legacy-course.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-course.api")>()),
	useLegacyCourseApi: vi.fn(),
}));
vi.mock("@/composables/legacy-school-people.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-school-people.api")>()),
	useLegacySchoolPeopleApi: vi.fn(),
}));
vi.mock("@/utils/api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/utils/api")>()),
	$axios: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	useAppStore: vi.fn(),
	useSchoolStore: vi.fn(),
	notifySuccess: vi.fn(),
	notifyError: vi.fn(),
}));


const setup = async (path: string) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore();
	vi.mocked(useAppStore).mockReturnValue({ user: { id: "teacher-1" }, isTeacher: true } as unknown as ReturnType<
		typeof useAppStore
	>);
	vi.mocked(useSchoolStore).mockReturnValue({
		schoolDetails: {
			years: {
				schoolYears: [{ id: "y1", name: "2026/27" }],
				activeYear: { id: "y1", startDate: "2026-08-01T00:00:00.000Z", endDate: "2027-07-31T00:00:00.000Z" },
			},
		},
	} as unknown as ReturnType<typeof useSchoolStore>);
	vi.mocked(useLegacySchoolPeopleApi).mockReturnValue({
		listUsers: vi.fn().mockResolvedValue([{ _id: "teacher-1", firstName: "Karl", lastName: "Lehrer" }]),
		listClasses: vi
			.fn()
			.mockResolvedValue([
				{ _id: "class-1", displayName: "9b", year: "y1", schoolId: "s", teacherIds: [], userIds: [] },
			]),
	});
	const created = {
		_id: "new-course",
		name: "Chemie",
		startDate: "2026-08-01T00:00:00.000Z",
		untilDate: "2027-07-31T00:00:00.000Z",
		times: [{ _id: "t1", weekday: 1, startTime: 29700000, duration: 2700000, room: "R1" }],
	};
	const api = {
		getCourse: vi.fn(),
		createCourse: vi.fn().mockResolvedValue(created),
		updateCourse: vi.fn(),
		deleteCourse: vi.fn(),
	};
	vi.mocked(useLegacyCourseApi).mockReturnValue(api as unknown as ReturnType<typeof useLegacyCourseApi>);
	vi.mocked(utils.$axios.post).mockResolvedValue({ data: {} });
	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{ path: "/courses/add", component: CourseEditPage },
			{ path: "/courses/:id/edit", component: CourseEditPage },
			{ path: "/:rest(.*)*", component: { template: "<div />" } },
		],
	});
	await router.push(path);
	await router.isReady();
	const wrapper = mount(CourseEditPage, { global: { plugins: [router, createTestingVuetify(), createTestingI18n()] } });
	await flushPromises();
	return { wrapper, api, router };
};

describe("CourseEditPage", () => {
	it("creates a course taught by the teacher with its times in milliseconds and a weekly event", async () => {
		const { wrapper, api, router } = await setup("/courses/add");

		await wrapper.get("[data-testid='coursename'] input").setValue(" Chemie ");
		await wrapper.get("[data-testid='add-new-course-appointment']").trigger("click");
		await wrapper.get("[data-testid='start-lesson-time'] input").setValue("08:15");
		await wrapper.get("[data-testid='lesson-duration'] input").setValue("45");
		await wrapper.get("[data-testid='course-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createCourse).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Chemie",
				teacherIds: ["teacher-1"],
				color: "#455B6A",
				times: [{ weekday: 0, startTime: 29700000, duration: 2700000, room: "" }],
			})
		);
		expect(utils.$axios.post).toHaveBeenCalledWith(
			"/v1/calendar",
			expect.objectContaining({ frequency: "WEEKLY", weekday: "TU", courseId: "new-course", courseTimeId: "t1" })
		);
		await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/rooms/new-course"));
	});

	it("needs a name", async () => {
		const { wrapper, api } = await setup("/courses/add");

		await wrapper.get("[data-testid='course-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createCourse).not.toHaveBeenCalled();
	});
});
