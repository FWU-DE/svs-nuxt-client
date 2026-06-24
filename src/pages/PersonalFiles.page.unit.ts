import PersonalFilesPage from "./PersonalFiles.page.vue";
import { createTestAppStore, createTestEnvStore, fileRecordFactory, mockApiResponse } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as fileStorageApi from "@api-file-storage";
import { FileApiInterface, FileRecordListResponse, FileRecordParentType, StorageLocation } from "@api-file-storage";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("PersonalFilesPage", () => {
	let fileApi: Mocked<FileApiInterface>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		fileApi = {
			list: vi.fn(),
		} as unknown as Mocked<FileApiInterface>;
		vi.spyOn(fileStorageApi, "FileApiFactory").mockReturnValue(fileApi);
	});

	const setup = async ({
		withContext = true,
		files = [fileRecordFactory.build({ id: "file-1", name: "Document.pdf" })],
	} = {}) => {
		if (withContext) {
			createTestAppStore({ me: { user: { id: "user-1" }, school: { id: "school-1" } } });
		} else {
			createTestAppStore({ me: { user: undefined, school: undefined } });
		}

		fileApi.list.mockResolvedValue(
			mockApiResponse<FileRecordListResponse>({ data: { data: files, total: files.length, skip: 0, limit: 100 } })
		);

		const wrapper = mount(PersonalFilesPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});
		await flushPromises();
		return { wrapper, files };
	};

	it("loads and renders personal files", async () => {
		const { wrapper, files } = await setup();

		expect(fileApi.list).toHaveBeenCalledWith(
			"school-1",
			StorageLocation.SCHOOL,
			"user-1",
			FileRecordParentType.USERS,
			0,
			100
		);
		expect(wrapper.find("[data-testid='personal-files-title']").exists()).toBe(true);
		expect(wrapper.get(`[data-testid='personal-file-${files[0].id}']`).text()).toContain("Document.pdf");
	});

	it("renders missing context state", async () => {
		const { wrapper } = await setup({ withContext: false });

		expect(fileApi.list).not.toHaveBeenCalled();
		expect(wrapper.find("[data-testid='personal-files-missing-context']").exists()).toBe(true);
	});

	it("renders empty state", async () => {
		const { wrapper } = await setup({ files: [] });

		expect(wrapper.find("[data-testid='personal-files-empty']").exists()).toBe(true);
	});
});
