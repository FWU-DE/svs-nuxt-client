import CourseFilesPage from "./CourseFiles.page.vue";
import { createTestAppStore, createTestEnvStore, mockApiResponse } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { CourseMetadataListResponse, CoursesApiInterface } from "@api-server";
import { legacyFileStorageApi } from "@data-legacy-files";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";
import { createRouter, createWebHistory } from "vue-router";

const COURSE = "6ab7b011ef5e199ec0083aff";

describe("CourseFilesPage", () => {
	let coursesApi: Mocked<CoursesApiInterface>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		createTestAppStore({ me: { user: { id: "user-1" }, school: { id: "school-1" } } });
		coursesApi = { courseControllerFindForUser: vi.fn() } as unknown as Mocked<CoursesApiInterface>;
		vi.spyOn(serverApi, "CoursesApiFactory").mockReturnValue(coursesApi);
		coursesApi.courseControllerFindForUser.mockResolvedValue(
			mockApiResponse<CourseMetadataListResponse>({
				data: { data: [{ id: COURSE, title: "Mathe" }], total: 1, skip: 0, limit: 100 },
			} as never)
		);
		vi.spyOn(legacyFileStorageApi, "list").mockResolvedValue([]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const setup = async (path: string) => {
		const router = createRouter({
			history: createWebHistory(),
			routes: [
				{ path: "/files/courses/:courseId?/:folderId?", component: CourseFilesPage },
				{ path: "/rooms/:id", component: { template: "<div />" } },
			],
		});
		await router.push(path);
		await router.isReady();
		const wrapper = mount(CourseFilesPage, {
			global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
		});
		await flushPromises();
		return { wrapper };
	};

	it("lists the user's courses as folders", async () => {
		const { wrapper } = await setup("/files/courses");

		expect(coursesApi.courseControllerFindForUser).toHaveBeenCalledWith(0, 100);
		expect(wrapper.get(`[data-testid='course-files-course-${COURSE}']`).text()).toContain("Mathe");
		expect(legacyFileStorageApi.list).not.toHaveBeenCalled();
	});

	it("shows a course's files with the course as owner and a way back to the course", async () => {
		const { wrapper } = await setup(`/files/courses/${COURSE}`);

		expect(legacyFileStorageApi.list).toHaveBeenCalledWith(COURSE, undefined);
		expect(wrapper.find("[data-testid='course-files-to-course']").exists()).toBe(true);
		expect(wrapper.get("[data-testid='breadcrumb-1']").text()).toContain("Mathe");
	});
});
