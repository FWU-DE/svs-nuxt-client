import LegacyFileBrowser from "./LegacyFileBrowser.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LegacyFile, legacyFileStorageApi } from "@data-legacy-files";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

const entry = (overrides: Partial<LegacyFile>): LegacyFile => ({
	_id: "x",
	name: "x",
	isDirectory: false,
	size: 1,
	owner: "u1",
	refOwnerModel: "user",
	permissions: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	...overrides,
});

const entries = [
	entry({ _id: "d1", name: "Mathe", isDirectory: true }),
	entry({ _id: "f1", name: "b.pdf", updatedAt: "2026-01-02T00:00:00.000Z" }),
	entry({ _id: "f2", name: "a.pdf", updatedAt: "2026-01-03T00:00:00.000Z" }),
	entry({ _id: "f3", name: "virus.exe", securityCheck: { status: "blocked" } }),
];

describe("LegacyFileBrowser", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.spyOn(legacyFileStorageApi, "list").mockResolvedValue(entries);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const setup = async (props: Record<string, unknown> = {}) => {
		const wrapper = mount(LegacyFileBrowser, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { rootId: "u1", rootName: "Meine Dateien", ...props },
		});
		await flushPromises();
		return { wrapper };
	};

	it("lists folders and files of the folder shown", async () => {
		const { wrapper } = await setup({ ownerId: "course-1", parentId: "dir-1" });

		expect(legacyFileStorageApi.list).toHaveBeenCalledWith("course-1", "dir-1");
		expect(wrapper.find("[data-testid='legacy-folder-d1']").text()).toContain("Mathe");
		expect(wrapper.findAll("[data-testid^='legacy-file-f']")).not.toHaveLength(0);
	});

	it("sorts files by the newest change first, like the legacy list", async () => {
		const { wrapper } = await setup();

		const names = wrapper.findAll(".file-card .file-name").map((n) => n.text());
		expect(names.slice(0, 2)).toEqual(["a.pdf", "b.pdf"]);
	});

	it("opens a folder", async () => {
		const { wrapper } = await setup();

		await wrapper.get("[data-testid='legacy-folder-d1']").trigger("click");

		expect(wrapper.emitted("open-folder")?.[0][0]).toMatchObject({ _id: "d1" });
	});

	it("does not offer to download a blocked file", async () => {
		const { wrapper } = await setup();

		expect(wrapper.get("[data-testid='legacy-file-download-f3']").attributes("disabled")).toBeDefined();
		expect(wrapper.find("[data-testid='legacy-file-open-f3']").exists()).toBe(false);
	});

	it("creates a folder in the folder shown", async () => {
		const create = vi.spyOn(legacyFileStorageApi, "createDirectory").mockResolvedValue(entry({ isDirectory: true }));
		const { wrapper } = await setup({ ownerId: "course-1", parentId: "dir-1" });

		await wrapper.get("[data-testid='legacy-create-folder']").trigger("click");
		await flushPromises();
		const dialog = wrapper.findComponent({ name: "LegacyFileNameDialog" });
		dialog.vm.$emit("submit", "Neu");
		await flushPromises();

		expect(create).toHaveBeenCalledWith("Neu", "course-1", "dir-1");
	});

	it("deletes after confirmation", async () => {
		const remove = vi.spyOn(legacyFileStorageApi, "remove").mockResolvedValue();
		const { wrapper } = await setup();

		await wrapper.get("[data-testid='legacy-file-delete-f1']").trigger("click");
		await flushPromises();
		expect(remove).not.toHaveBeenCalled();
		await wrapper.findComponent({ name: "VDialog" }).vm.$nextTick();
		(document.querySelector("[data-testid='legacy-file-delete-confirm']") as HTMLElement).click();
		await flushPromises();

		expect(remove).toHaveBeenCalledWith(expect.objectContaining({ _id: "f1" }));
	});

	it("uploads picked files into the folder shown", async () => {
		const upload = vi.spyOn(legacyFileStorageApi, "upload").mockResolvedValue(entry({}));
		const { wrapper } = await setup({ parentId: "dir-1" });
		const input = wrapper.get("[data-testid='legacy-file-input']");
		const file = new File(["x"], "neu.txt");
		Object.defineProperty(input.element, "files", { value: [file] });

		await input.trigger("change");
		await flushPromises();

		expect(upload).toHaveBeenCalledWith(file, undefined, "dir-1");
	});

	it("shows only reading actions for files shared with me", async () => {
		const { wrapper } = await setup({ canUpload: false, canCreateDir: false, canManage: false });

		expect(wrapper.find("[data-testid='legacy-file-upload']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='legacy-create-folder']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='legacy-file-delete-f1']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='legacy-file-download-f1']").exists()).toBe(true);
	});
});
