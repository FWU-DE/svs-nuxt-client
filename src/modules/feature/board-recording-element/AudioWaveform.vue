<template>
	<canvas
		ref="canvas"
		class="waveform"
		:class="{ 'waveform--live': !!analyser }"
		:aria-label="t('components.cardElement.recordingElement.waveform')"
		role="img"
		data-testid="recording-waveform"
		@click="onSeek"
	/>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		/** While recording: the live signal. */
		analyser?: AnalyserNode;
		/** After recording: the file to draw the peaks of. */
		audioUrl?: string;
		progress?: number;
	}>(),
	{ analyser: undefined, audioUrl: undefined, progress: 0 }
);

const emit = defineEmits<{
	(e: "seek", ratio: number): void;
}>();

const { t } = useI18n();

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const peaks = ref<number[]>([]);
let frame: number | undefined;

const BAR_WIDTH = 3;
const BAR_GAP = 2;

const cssColor = (name: string) => `rgb(var(--v-theme-${name}))`;

const context2d = (): CanvasRenderingContext2D | undefined => {
	const element = canvas.value;
	if (!element) return undefined;

	// Match the backing store to the CSS size so the bars are not blurry on a retina screen.
	const ratio = window.devicePixelRatio || 1;
	const width = element.clientWidth || 300;
	const height = element.clientHeight || 56;
	if (element.width !== width * ratio || element.height !== height * ratio) {
		element.width = width * ratio;
		element.height = height * ratio;
	}

	const ctx = element.getContext("2d");
	if (!ctx) return undefined;

	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	ctx.clearRect(0, 0, width, height);

	return ctx;
};

const drawBars = (values: number[], playedRatio: number) => {
	const ctx = context2d();
	const element = canvas.value;
	if (!ctx || !element) return;

	const width = element.clientWidth || 300;
	const height = element.clientHeight || 56;
	const middle = height / 2;
	const step = BAR_WIDTH + BAR_GAP;
	const count = Math.max(1, Math.floor(width / step));

	for (let i = 0; i < count; i++) {
		// The peaks array rarely has exactly as many entries as there are bars.
		const value = values[Math.floor((i / count) * values.length)] ?? 0;
		const barHeight = Math.max(2, value * (height - 4));
		const x = i * step;

		ctx.fillStyle = i / count <= playedRatio ? cssColor("primary") : cssColor("on-surface-variant");
		ctx.globalAlpha = i / count <= playedRatio ? 1 : 0.35;
		ctx.fillRect(x, middle - barHeight / 2, BAR_WIDTH, barHeight);
	}

	ctx.globalAlpha = 1;
};

const renderLive = () => {
	const analyser = props.analyser;
	if (!analyser) return;

	const buffer = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteTimeDomainData(buffer);

	// 128 is silence in time-domain data; the distance from it is the amplitude.
	const bars = 64;
	const slice = Math.floor(buffer.length / bars);
	const values = Array.from({ length: bars }, (_, i) => {
		let peak = 0;
		for (let j = 0; j < slice; j++) {
			peak = Math.max(peak, Math.abs(buffer[i * slice + j] - 128) / 128);
		}
		return peak;
	});

	drawBars(values, 1);
	frame = requestAnimationFrame(renderLive);
};

/**
 * Decodes the recording once and reduces it to as many peaks as the canvas can show. Anything
 * finer would be thrown away by the renderer anyway.
 */
const loadPeaks = async (url: string) => {
	try {
		const response = await fetch(url, { credentials: "include" });
		const arrayBuffer = await response.arrayBuffer();
		const audioContext = new AudioContext();
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
		const channel = audioBuffer.getChannelData(0);

		const bars = 160;
		const slice = Math.floor(channel.length / bars) || 1;
		const values: number[] = [];
		let loudest = 0;
		for (let i = 0; i < bars; i++) {
			let peak = 0;
			for (let j = 0; j < slice; j++) {
				peak = Math.max(peak, Math.abs(channel[i * slice + j] ?? 0));
			}
			values.push(peak);
			loudest = Math.max(loudest, peak);
		}

		// Normalise, so a quiet recording still looks like a waveform and not like a flat line.
		peaks.value = loudest > 0 ? values.map((value) => value / loudest) : values;
		await audioContext.close();
	} catch {
		// A waveform is decoration. If the file cannot be decoded the player still works.
		peaks.value = [];
	}
};

const stopLive = () => {
	if (frame !== undefined) {
		cancelAnimationFrame(frame);
		frame = undefined;
	}
};

const onSeek = (event: MouseEvent) => {
	const element = canvas.value;
	if (!element || props.analyser) return;

	const rect = element.getBoundingClientRect();
	emit("seek", Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
};

watch(
	() => props.analyser,
	(analyser) => {
		stopLive();
		if (analyser) renderLive();
	},
	{ immediate: true }
);

watch(
	() => props.audioUrl,
	(url) => {
		peaks.value = [];
		if (url) void loadPeaks(url);
	},
	{ immediate: true }
);

watch([peaks, () => props.progress], () => {
	if (!props.analyser) drawBars(peaks.value, props.progress);
});

const hasSomethingToDraw = computed(() => !!props.analyser || peaks.value.length > 0);

onMounted(() => {
	if (hasSomethingToDraw.value && !props.analyser) drawBars(peaks.value, props.progress);
});

onBeforeUnmount(stopLive);
</script>

<style lang="scss" scoped>
.waveform {
	width: 100%;
	height: 56px;
	display: block;
	border-radius: 4px;
	background: rgba(var(--v-theme-on-surface), 0.04);
	cursor: pointer;
}

.waveform--live {
	cursor: default;
}
</style>
