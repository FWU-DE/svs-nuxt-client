import { onBeforeUnmount, readonly, ref } from "vue";

export type RecorderState = "idle" | "requesting" | "recording" | "unsupported" | "denied";

/**
 * Thin wrapper around the browser's MediaRecorder. It owns the stream, because forgetting to
 * stop the tracks leaves the camera light on — the one bug in this area users notice
 * immediately and never forgive.
 */
export const useMediaRecorder = () => {
	const state = ref<RecorderState>("idle");
	const error = ref<string | undefined>(undefined);
	const elapsedSeconds = ref(0);
	const previewStream = ref<MediaStream | undefined>(undefined);
	/** Live signal for the waveform; only alive while recording. */
	const analyser = ref<AnalyserNode | undefined>(undefined);

	let recorder: MediaRecorder | undefined;
	let chunks: Blob[] = [];
	let ticker: ReturnType<typeof setInterval> | undefined;
	let audioContext: AudioContext | undefined;

	const isSupported = (): boolean =>
		typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices;

	const releaseStream = () => {
		previewStream.value?.getTracks().forEach((track) => track.stop());
		previewStream.value = undefined;
		analyser.value = undefined;
		void audioContext?.close();
		audioContext = undefined;
	};

	/**
	 * Taps the microphone signal for the waveform. Decoration, so a browser without Web Audio
	 * simply records without a picture instead of failing.
	 */
	const attachAnalyser = (stream: MediaStream) => {
		try {
			audioContext = new AudioContext();
			const node = audioContext.createAnalyser();
			node.fftSize = 1024;
			audioContext.createMediaStreamSource(stream).connect(node);
			analyser.value = node;
		} catch {
			analyser.value = undefined;
		}
	};

	const stopTicker = () => {
		if (ticker !== undefined) {
			clearInterval(ticker);
			ticker = undefined;
		}
	};

	const start = async (video: boolean): Promise<void> => {
		if (!isSupported()) {
			state.value = "unsupported";
			return;
		}

		state.value = "requesting";
		error.value = undefined;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
			previewStream.value = stream;
			attachAnalyser(stream);
			chunks = [];
			recorder = new MediaRecorder(stream);
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunks.push(event.data);
			};
			recorder.start();

			elapsedSeconds.value = 0;
			ticker = setInterval(() => {
				elapsedSeconds.value += 1;
			}, 1000);
			state.value = "recording";
		} catch (cause) {
			releaseStream();
			state.value = "denied";
			error.value = cause instanceof Error ? cause.message : String(cause);
		}
	};

	/** Resolves once the recorder has flushed everything it buffered. */
	const stop = (): Promise<Blob | undefined> =>
		new Promise((resolve) => {
			stopTicker();

			if (!recorder || recorder.state === "inactive") {
				releaseStream();
				state.value = "idle";
				resolve(undefined);
				return;
			}

			const mimeType = recorder.mimeType;
			recorder.onstop = () => {
				releaseStream();
				state.value = "idle";
				resolve(chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : undefined);
			};
			recorder.stop();
		});

	const cancel = () => {
		stopTicker();
		if (recorder && recorder.state !== "inactive") {
			recorder.onstop = null;
			recorder.stop();
		}
		chunks = [];
		releaseStream();
		state.value = "idle";
	};

	onBeforeUnmount(cancel);

	return {
		state: readonly(state),
		error: readonly(error),
		elapsedSeconds: readonly(elapsedSeconds),
		previewStream,
		analyser,
		isSupported,
		start,
		stop,
		cancel,
	};
};
