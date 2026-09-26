import CourseGroupEditPage from "./CourseGroupEdit.page.vue";
import { useLegacyCourseApi } from "@/composables/legacy-course.api";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useAppStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@/composables/legacy-course.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-course.api")>()),
	useLegacyCourseApi: vi.fn(),
}));
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	useAppStore: vi.fn(),
	notifyError: vi.fn(),
}));

const COURSE = "0000dcfbfb5c7a3f00bf21ab";

const setup = async (path: string, permissions: string[]) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore();
	vi.mocked(useAppStore).mockReturnValue({
		user: { id: "student-1" },
		userPermissions: permissions,
	} as unknown as ReturnType<typeof useAppStore>);
	const api = {
		getCourseWithPeople: vi.fn().mockResolvedValue({
			name: "Mathe",
			userIds: [
				{ _id: "student-1", firstName: "Marla", lastName: "Mathe" },
				{ _id: "student-2", firstName: "Paul", lastName: "Physik" },
			],
		}),
		getGroup: vi.fn().mockResolvedValue({ _id: "group-1", name: "Gruppe A", userIds: [{ _id: "student-2" }] }),
		createGroup: vi.fn().mockResolvedValue({ _id: "group-new" }),
		updateGroup: vi.fn().mockResolvedValue({ _id: "group-1" }),
	};
	vi.mocked(useLegacyCourseApi).mockReturnValue(api as unknown as ReturnType<typeof useLegacyCourseApi>);
	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{ path: "/courses/:courseId/groups/add", component: CourseGroupEditPage },
			{ path: "/courses/:courseId/groups/:groupId/edit", component: CourseGroupEditPage },
			{ path: "/:rest(.*)*", component: { template: "<div />" } },
		],
	});
	await router.push(path);
	await router.isReady();
	const wrapper = mount(CourseGroupEditPage, {
		global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
	});
	await flushPromises();
	return { wrapper, api, router };
};

describe("CourseGroupEditPage", () => {
	it("creates a group with the student in it and opens the group", async () => {
		const { wrapper, api, router } = await setup(`/courses/${COURSE}/groups/add`, ["COURSEGROUP_CREATE"]);

		await wrapper.get("[data-testid='group-name-field'] input").setValue("Team Brüche");
		await wrapper.get("[data-testid='course-group-form']").trigger("submit");
		await flushPromises();

		expect(api.createGroup).toHaveBeenCalledWith({ name: "Team Brüche", courseId: COURSE, userIds: ["student-1"] });
		await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(`/courses/${COURSE}/groups/group-new`));
	});

	it("keeps a student who may not edit the course in a group they change", async () => {
		const { wrapper, api } = await setup(`/courses/${COURSE}/groups/group-1/edit`, ["COURSEGROUP_EDIT"]);

		await wrapper.get("[data-testid='course-group-form']").trigger("submit");
		await flushPromises();

		expect(api.updateGroup).toHaveBeenCalledWith("group-1", { name: "Gruppe A", userIds: ["student-2", "student-1"] });
	});

	it("lets a teacher save a group without themselves", async () => {
		const { wrapper, api } = await setup(`/courses/${COURSE}/groups/group-1/edit`, ["COURSEGROUP_EDIT", "COURSE_EDIT"]);

		await wrapper.get("[data-testid='course-group-form']").trigger("submit");
		await flushPromises();

		expect(api.updateGroup).toHaveBeenCalledWith("group-1", { name: "Gruppe A", userIds: ["student-2"] });
	});
});
