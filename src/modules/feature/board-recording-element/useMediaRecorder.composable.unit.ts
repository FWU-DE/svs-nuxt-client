import { useMediaRecorder } from "./useMediaRecorder.composable";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";

type RecorderApi = ReturnType<typeof useMediaRecorder>;

/** The composable uses onBeforeUnmount, so it has to run inside a component. */
const setup = () => {
	let api!: RecorderApi;
	const wrapper = mount(
		defineComponent({
			setup() {
				api = useMediaRecorder();
				return () => null;
			},
		})
	);

	return { api, wrapper };
};

const buildTrack = () => ({ stop: vi.fn() });

const stubMediaDevices = (tracks: { stop: () => void }[]) => {
	const stream = { getTracks: () => tracks } as unknown as MediaStream;
	const getUserMedia = vi.fn().mockResolvedValue(stream);
	Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });

	return { getUserMedia, stream };
};

class FakeMediaRecorder {
	public static instances: FakeMediaRecorder[] = [];
	public state: "inactive" | "recording" = "inactive";
	public ondataavailable: ((event: { data: Blob }) => void) | null = null;
	public onstop: (() => void) | null = null;
	public readonly mimeType = "audio/webm";

	constructor(public stream: MediaStream) {
		FakeMediaRecorder.instances.push(this);
	}

	public start() {
		this.state = "recording";
	}

	public stop() {
		this.state = "inactive";
		this.ondataavailable?.({ data: new Blob(["chunk"], { type: this.mimeType }) });
		this.onstop?.();
	}
}

describe("useMediaRecorder", () => {
	beforeEach(() => {
		FakeMediaRecorder.instances = [];
		Object.defineProperty(window, "MediaRecorder", { value: FakeMediaRecorder, configurable: true, writable: true });
	});

	describe("when the browser cannot record", () => {
		it("should report it instead of throwing", async () => {
			Object.defineProperty(window, "MediaRecorder", { value: undefined, configurable: true, writable: true });
			const { api } = setup();

			await api.start(false);

			expect(api.state.value).toBe("unsupported");
		});
	});

	describe("when permission is refused", () => {
		it("should report it and leave no stream behind", async () => {
			const getUserMedia = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
			Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
			const { api } = setup();

			await api.start(false);

			expect(api.state.value).toBe("denied");
			expect(api.previewStream.value).toBeUndefined();
		});
	});

	describe("when a recording is made", () => {
		it("should ask for audio only in audio mode", async () => {
			const { getUserMedia } = stubMediaDevices([buildTrack()]);
			const { api } = setup();

			await api.start(false);

			expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
		});

		it("should return the recorded blob", async () => {
			stubMediaDevices([buildTrack()]);
			const { api } = setup();

			await api.start(false);
			const blob = await api.stop();

			expect(blob).toBeInstanceOf(Blob);
		});

		it("should release the camera and microphone when it stops", async () => {
			const track = buildTrack();
			stubMediaDevices([track]);
			const { api } = setup();

			await api.start(false);
			await api.stop();

			expect(track.stop).toHaveBeenCalled();
			expect(api.previewStream.value).toBeUndefined();
		});

		it("should release them on cancel as well", async () => {
			const track = buildTrack();
			stubMediaDevices([track]);
			const { api } = setup();

			await api.start(true);
			api.cancel();

			expect(track.stop).toHaveBeenCalled();
			expect(api.state.value).toBe("idle");
		});

		it("should release them when the element disappears mid-recording", async () => {
			const track = buildTrack();
			stubMediaDevices([track]);
			const { api, wrapper } = setup();

			await api.start(true);
			wrapper.unmount();
			await nextTick();

			expect(track.stop).toHaveBeenCalled();
		});
	});
});
