import TopicEditPage from "./TopicEdit.page.vue";
import { useLegacyCourseApi } from "@/composables/legacy-course.api";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
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
	notifySuccess: vi.fn(),
	notifyError: vi.fn(),
}));

const COURSE = "0000dcfbfb5c7a3f00bf21ab";
const GROUP = "5fa2c589550cdec021a1c5a2";

const setup = async (path: string) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore();
	const api = {
		getCourse: vi.fn().mockResolvedValue({ _id: COURSE, name: "Mathe", teacherIds: [], substitutionIds: [] }),
		getLesson: vi.fn().mockResolvedValue({
			_id: "topic-1",
			name: "Brüche",
			courseId: COURSE,
			hidden: false,
			position: 0,
			materials: [],
			contents: [
				{ component: "text", title: "Einstieg", content: { text: "<p>Hallo</p>" } },
				{ component: "resources", title: "Material", content: { resources: [{ url: "https://x.de", title: "X" }] } },
			],
		}),
		createLesson: vi.fn().mockResolvedValue({ _id: "new-topic" }),
		updateLesson: vi.fn().mockResolvedValue({ _id: "topic-1" }),
	};
	vi.mocked(useLegacyCourseApi).mockReturnValue(api as unknown as ReturnType<typeof useLegacyCourseApi>);
	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{ path: "/courses/:courseId/topics/add", component: TopicEditPage },
			{ path: "/courses/:courseId/topics/:topicId/edit", component: TopicEditPage },
			{ path: "/:rest(.*)*", component: { template: "<div />" } },
		],
	});
	await router.push(path);
	await router.isReady();
	const wrapper = mount(TopicEditPage, {
		global: { plugins: [router, createTestingVuetify(), createTestingI18n()], stubs: ["ClassicEditor"] },
	});
	await flushPromises();
	return { wrapper, api, router };
};

describe("TopicEditPage", () => {
	it("creates a course topic with a GeoGebra block and opens it", async () => {
		const { wrapper, api, router } = await setup(`/courses/${COURSE}/topics/add`);

		await wrapper.get("[data-testid='topic-name'] input").setValue("Neues Thema");
		await wrapper.get("[data-testid='topic-addcontent-geogebra-btn']").trigger("click");
		await wrapper.get("[data-testid='topic-block-geogebra'] input").setValue(" kEBfU7AR ");
		await wrapper.get("[data-testid='topic-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createLesson).toHaveBeenCalledWith({
			name: "Neues Thema",
			courseId: COURSE,
			contents: [{ component: "geoGebra", title: "", hidden: false, content: { materialId: "kEBfU7AR" } }],
		});
		await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(`/courses/${COURSE}/topics/new-topic`));
	});

	it("puts a topic of a course group into the group", async () => {
		const { wrapper, api } = await setup(`/courses/${COURSE}/topics/add?courseGroup=${GROUP}`);

		await wrapper.get("[data-testid='topic-name'] input").setValue("Gruppenthema");
		await wrapper.get("[data-testid='topic-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createLesson).toHaveBeenCalledWith(expect.objectContaining({ courseGroupId: GROUP, contents: [] }));
		expect(api.createLesson.mock.calls[0][0]).not.toHaveProperty("courseId");
	});

	it("keeps blocks it cannot edit and locks a block", async () => {
		const { wrapper, api } = await setup(`/courses/${COURSE}/topics/topic-1/edit`);

		expect(wrapper.findAll("[data-testid='topic-block']")).toHaveLength(2);
		expect(wrapper.find("[data-testid='topic-block-kept']").exists()).toBe(true);
		await wrapper.findAll("[data-testid='topic-block-hidden']")[0].trigger("click");
		await wrapper.get("[data-testid='topic-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.updateLesson).toHaveBeenCalledWith("topic-1", {
			name: "Brüche",
			courseId: COURSE,
			contents: [
				{ component: "text", title: "Einstieg", hidden: true, content: { text: "<p>Hallo</p>" } },
				{
					component: "resources",
					title: "Material",
					hidden: false,
					content: { resources: [{ url: "https://x.de", title: "X" }] },
				},
			],
		});
	});

	it("does not save without a title", async () => {
		const { wrapper, api } = await setup(`/courses/${COURSE}/topics/add`);

		await wrapper.get("[data-testid='topic-edit-form']").trigger("submit");
		await flushPromises();

		expect(api.createLesson).not.toHaveBeenCalled();
	});
});
