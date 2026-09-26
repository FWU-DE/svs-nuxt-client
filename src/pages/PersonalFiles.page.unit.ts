import PersonalFilesPage from "./PersonalFiles.page.vue";
import { createTestAppStore, createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LegacyFile, legacyFileStorageApi } from "@data-legacy-files";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

const folder = (id: string, name: string, parent?: string): LegacyFile => ({
	_id: id,
	name,
	parent,
	isDirectory: true,
	owner: "user-1",
	refOwnerModel: "user",
	permissions: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("PersonalFilesPage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		createTestAppStore({ me: { user: { id: "user-1" }, school: { id: "school-1" } } });
		vi.spyOn(legacyFileStorageApi, "list").mockResolvedValue([folder("d1", "Mathe")]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const setup = async (path: string) => {
		const router = createRouter({
			history: createWebHistory(),
			routes: [{ path: "/files/my/:folderId?", component: PersonalFilesPage }],
		});
		await router.push(path);
		await router.isReady();
		const wrapper = mount(PersonalFilesPage, {
			global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
		});
		await flushPromises();
		return { wrapper, router };
	};

	it("shows the personal root with the product's breadcrumb", async () => {
		const { wrapper } = await setup("/files/my");

		expect(legacyFileStorageApi.list).toHaveBeenCalledWith(undefined, undefined);
		expect(wrapper.get("[data-testid='personal-files-title']").text()).toBe("pages.files.legacy.personalTitle");
		expect(wrapper.get("[data-testid='breadcrumb-0']").text()).toContain("pages.files.legacy.myPersonalData");
	});

	it("shows a folder with its chain in the breadcrumbs", async () => {
		vi.spyOn(legacyFileStorageApi, "folderChain").mockResolvedValue([
			folder("d1", "Mathe"),
			folder("d2", "Brüche", "d1"),
		]);

		const { wrapper } = await setup("/files/my/6ab7b011ef5e199ec0083afe");

		expect(legacyFileStorageApi.list).toHaveBeenCalledWith(undefined, "6ab7b011ef5e199ec0083afe");
		expect(wrapper.get("[data-testid='breadcrumb-2']").text()).toContain("Brüche");
	});

	it("navigates into a folder", async () => {
		const { wrapper, router } = await setup("/files/my");
		const push = vi.spyOn(router, "push");

		await wrapper.get("[data-testid='legacy-folder-d1']").trigger("click");

		expect(push).toHaveBeenCalledWith("/files/my/d1");
	});
});
