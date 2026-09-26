import CourseRoomGroups from "./CourseRoomGroups.vue";
import { useLegacyCourseApi } from "@/composables/legacy-course.api";
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
}));

const groups = [
	{
		_id: "g1",
		name: "Gruppe A",
		courseId: "c1",
		schoolId: "s",
		userIds: [{ _id: "me", firstName: "Ich", lastName: "Selbst" }],
	},
	{
		_id: "g2",
		name: "Gruppe B",
		courseId: "c1",
		schoolId: "s",
		userIds: [{ _id: "other", firstName: "Du", lastName: "Andere" }],
	},
];

const setup = async (permissions: string[], found = groups) => {
	setActivePinia(createTestingPinia({ initialState: { courseRoomDetailsStore: { roomData: { isArchived: false } } } }));
	vi.mocked(useAppStore).mockReturnValue({ user: { id: "me" }, userPermissions: permissions } as unknown as ReturnType<
		typeof useAppStore
	>);
	vi.mocked(useLegacyCourseApi).mockReturnValue({
		findGroups: vi.fn().mockResolvedValue(found),
	} as unknown as ReturnType<typeof useLegacyCourseApi>);
	const router = createRouter({
		history: createWebHistory(),
		routes: [{ path: "/:rest(.*)*", component: { template: "<div />" } }],
	});
	const wrapper = mount(CourseRoomGroups, {
		props: { roomId: "c1" },
		global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
	});
	await flushPromises();
	return { wrapper };
};

describe("CourseRoomGroups", () => {
	it("shows a teacher all groups", async () => {
		const { wrapper } = await setup(["COURSE_EDIT", "COURSEGROUP_CREATE"]);

		expect(wrapper.findAll("[data-testid='group-name-entry']")).toHaveLength(2);
		expect(wrapper.find("[data-testid='add-course-group']").attributes("href")).toBe("/courses/c1/groups/add");
	});

	it("shows a student only their own groups", async () => {
		const { wrapper } = await setup(["COURSEGROUP_CREATE"]);

		const entries = wrapper.findAll("[data-testid='group-name-entry']");
		expect(entries).toHaveLength(1);
		expect(entries[0].text()).toContain("Gruppe A");
	});

	it("shows the empty state without create button when groups may not be created", async () => {
		const { wrapper } = await setup([], []);

		expect(wrapper.find("[data-testid='course-groups-empty']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='add-course-group']").exists()).toBe(false);
	});
});
