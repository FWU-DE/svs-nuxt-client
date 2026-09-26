import SharedFilesPage from "./SharedFiles.page.vue";
import { createTestAppStore, createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { legacyFileStorageApi } from "@data-legacy-files";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("SharedFilesPage", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		createTestAppStore({ me: { user: { id: "user-1" }, school: { id: "school-1" } } });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("lists the files shared with the user, read-only", async () => {
		const shared = vi.spyOn(legacyFileStorageApi, "sharedWithMe").mockResolvedValue([
			{
				_id: "f1",
				name: "Geteilt.pdf",
				isDirectory: false,
				size: 3,
				owner: "other",
				refOwnerModel: "user",
				permissions: [{ refId: "user-1", read: true, write: false }],
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		]);

		const wrapper = mount(SharedFilesPage, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});
		await flushPromises();

		expect(shared).toHaveBeenCalledWith("user-1");
		expect(wrapper.get("[data-testid='legacy-file-f1']").text()).toContain("Geteilt.pdf");
		expect(wrapper.find("[data-testid='legacy-file-upload']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='legacy-file-delete-f1']").exists()).toBe(false);
	});
});
