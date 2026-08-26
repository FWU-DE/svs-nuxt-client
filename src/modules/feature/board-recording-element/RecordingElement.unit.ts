import RecordingElement from "./RecordingElement.vue";
import de from "@/locales/de";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ContentElementType, RecordingElementResponse, RecordingMediaType } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { ref } from "vue";

const stop = vi.fn();
const cancel = vi.fn();
const recorderState = ref<"idle" | "recording">("idle");

// Starting flips the state the same way the real composable does, so the stop button appears.
const start = vi.fn(() => {
	recorderState.value = "recording";
	return Promise.resolve();
});

vi.mock("./useMediaRecorder.composable", () => ({
	useMediaRecorder: () => ({
		state: recorderState,
		error: ref(undefined),
		elapsedSeconds: ref(0),
		previewStream: ref(undefined),
		analyser: ref(undefined),
		isSupported: () => true,
		start,
		stop,
		cancel,
	}),
}));

/** Records and stops, which is the flow that writes a file. */
const record = async (wrapper: ReturnType<typeof setup>["wrapper"]) => {
	await wrapper.find("[data-testid=recording-start]").trigger("click");
	await flushPromises();
	await wrapper.find("[data-testid=recording-stop]").trigger("click");
	await flushPromises();
	recorderState.value = "idle";
	await flushPromises();
};

const fileStorage = {
	fetchFiles: vi.fn(),
	upload: vi.fn(),
	getFileRecordsByParentId: vi.fn(() => [] as { id: string; url: string }[]),
	deleteFiles: vi.fn(),
};

vi.mock("@data-file", () => ({
	useFileStorageApi: () => fileStorage,
}));

vi.mock("@data-board", async (importOriginal) => {
	const original = await importOriginal<typeof import("@data-board")>();

	return {
		...original,
		useBoardFocusHandler: vi.fn(),
		useContentElementState: vi.fn(() => ({ modelValue: { value: { mediaType: "audio", caption: "" } } })),
	};
});

const buildElement = (): RecordingElementResponse => ({
	id: "recording-1",
	type: ContentElementType.RECORDING,
	timestamps: { createdAt: "2026-01-01T00:00:00Z", lastUpdatedAt: "2026-01-01T00:00:00Z" },
	content: { mediaType: RecordingMediaType.AUDIO, caption: "" },
});

const setup = () => {
	setActivePinia(createTestingPinia());

	const wrapper = mount(RecordingElement, {
		global: {
			plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
		},
		props: {
			element: buildElement(),
			isEditMode: true,
			columnIndex: 0,
			rowIndex: 0,
			elementIndex: 0,
		},
	});

	return { wrapper };
};

describe("RecordingElement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		recorderState.value = "idle";
		fileStorage.getFileRecordsByParentId.mockReturnValue([]);
		fileStorage.deleteFiles.mockResolvedValue(undefined);
		fileStorage.upload.mockResolvedValue(undefined);
	});

	describe("when the first recording is made", () => {
		it("should upload it and not try to delete anything", async () => {
			stop.mockResolvedValue(new Blob(["audio"], { type: "audio/webm" }));
			const { wrapper } = setup();

			await record(wrapper);

			expect(fileStorage.upload).toHaveBeenCalled();
			expect(fileStorage.deleteFiles).not.toHaveBeenCalled();
		});
	});

	describe("when a second recording replaces the first", () => {
		const setupWithExisting = () => {
			const previous = [{ id: "file-1", url: "/file-1" }];
			fileStorage.getFileRecordsByParentId.mockReturnValue(previous);
			stop.mockResolvedValue(new Blob(["audio"], { type: "audio/webm" }));

			return { ...setup(), previous };
		};

		it("should delete the previous file, so nothing is left orphaned in the storage", async () => {
			const { wrapper, previous } = setupWithExisting();

			await record(wrapper);

			expect(fileStorage.deleteFiles).toHaveBeenCalledWith(previous);
		});

		it("should delete before uploading, so the new take is the only file", async () => {
			const order: string[] = [];
			fileStorage.deleteFiles.mockImplementation(() => {
				order.push("delete");
				return Promise.resolve();
			});
			fileStorage.upload.mockImplementation(() => {
				order.push("upload");
				return Promise.resolve();
			});
			const { wrapper } = setupWithExisting();

			await record(wrapper);

			expect(order).toEqual(["delete", "upload"]);
		});

		it("should give the new take a different file name, so no cached url serves the old audio", async () => {
			const { wrapper } = setupWithExisting();

			await record(wrapper);

			const [file] = fileStorage.upload.mock.calls.at(-1) as [File];
			expect(file.name).toContain("recording-1");
			expect(file.name).toMatch(/\.webm$/);
		});

		it("should reload the file list afterwards, so the player shows the new take", async () => {
			const { wrapper } = setupWithExisting();

			await record(wrapper);

			expect(fileStorage.fetchFiles).toHaveBeenCalledWith("recording-1", expect.anything());
		});
	});

	describe("when the recorder returns nothing", () => {
		it("should neither delete nor upload", async () => {
			fileStorage.getFileRecordsByParentId.mockReturnValue([{ id: "file-1", url: "/file-1" }]);
			stop.mockResolvedValue(undefined);
			const { wrapper } = setup();

			await record(wrapper);

			expect(fileStorage.deleteFiles).not.toHaveBeenCalled();
			expect(fileStorage.upload).not.toHaveBeenCalled();
		});
	});
});
