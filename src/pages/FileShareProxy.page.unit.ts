import FileShareProxyPage from "./FileShareProxy.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LegacyFile, legacyFileStorageApi } from "@data-legacy-files";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

const FILE = "6ab7b011ef5e199ec0083b00";

const file = { _id: FILE, name: "Blatt.pdf" } as LegacyFile;

describe("FileShareProxyPage", () => {
	const replace = vi.fn();

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		vi.stubGlobal("location", { ...window.location, replace });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		replace.mockReset();
	});

	const setup = async (path: string) => {
		const router = createRouter({
			history: createWebHistory(),
			routes: [{ path: "/files/fileModel/:id/proxy", component: FileShareProxyPage }],
		});
		await router.push(path);
		await router.isReady();
		const wrapper = mount(FileShareProxyPage, {
			global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
		});
		await flushPromises();
		return { wrapper };
	};

	it("registers the share token, then opens the file", async () => {
		const register = vi.spyOn(legacyFileStorageApi, "registerShare").mockResolvedValue(file);
		vi.spyOn(legacyFileStorageApi, "signedUrl").mockResolvedValue("/api/v1/fileStorage/blob/t");

		await setup(`/files/fileModel/${FILE}/proxy?share=tok`);

		expect(register).toHaveBeenCalledWith(FILE, "tok");
		expect(replace).toHaveBeenCalledWith("/api/v1/fileStorage/blob/t");
	});

	it("says so when the file can't be opened", async () => {
		vi.spyOn(legacyFileStorageApi, "registerShare").mockRejectedValue(new Error("403"));

		const { wrapper } = await setup(`/files/fileModel/${FILE}/proxy?share=bad`);

		expect(wrapper.find("[data-testid='file-share-proxy-error']").exists()).toBe(true);
		expect(replace).not.toHaveBeenCalled();
	});
});
