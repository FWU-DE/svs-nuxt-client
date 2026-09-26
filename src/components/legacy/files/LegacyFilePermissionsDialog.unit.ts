import LegacyFilePermissionsDialog from "./LegacyFilePermissionsDialog.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { legacyFileStorageApi } from "@data-legacy-files";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("LegacyFilePermissionsDialog", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		// The service lists from the lowest role up; the dialog shows the highest first.
		vi.spyOn(legacyFileStorageApi, "permissions").mockResolvedValue([
			{ refId: "student", name: "student", read: true, write: false },
			{ refId: "teacher", name: "teacher", read: true, write: true },
		]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const setup = async () => {
		const wrapper = mount(LegacyFilePermissionsDialog, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { modelValue: true, fileId: "f1" },
			attachTo: document.body,
		});
		await flushPromises();
		return { wrapper };
	};

	it("saves only what changed, unticking the roles below along", async () => {
		const update = vi.spyOn(legacyFileStorageApi, "updatePermissions").mockResolvedValue();
		const { wrapper } = await setup();

		const teacherRead = document.querySelector(
			"[data-testid='legacy-permission-read-teacher'] input"
		) as HTMLInputElement;
		teacherRead.click();
		await flushPromises();
		(document.querySelector("[data-testid='legacy-file-permissions-save']") as HTMLElement).click();
		await flushPromises();

		expect(update).toHaveBeenCalledWith("f1", [
			{ refId: "teacher", read: false },
			{ refId: "student", read: false },
		]);
		wrapper.unmount();
	});
});
