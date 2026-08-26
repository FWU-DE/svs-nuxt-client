<template>
	<VCard class="mb-4" data-testid="board-recording-element" variant="outlined" :ripple="false">
		<ContentElementBar :icon="isVideo ? mdiVideoOutline : mdiMicrophoneOutline">
			<template #title>
				{{ element.content.caption || t(isVideo ? "components.cardElement.recordingElement.video" : "components.cardElement.recordingElement.audio") }}
			</template>
			<template v-if="isEditMode" #menu>
				<BoardMenu
					:scope="BoardMenuScope.RECORDING_ELEMENT"
					has-background
					:data-testid="`element-menu-button-${columnIndex}-${rowIndex}-${elementIndex}`"
				>
					<KebabMenuActionMoveUp v-if="isNotFirstElement" @click="onMoveUp" />
					<KebabMenuActionMoveDown v-if="isNotLastElement" @click="onMoveDown" />
					<KebabMenuActionDelete @click="onDelete" />
				</BoardMenu>
			</template>
			<template #element>
				<div class="pb-2 pr-1">
					<VBtnToggle
						v-if="isEditMode && !fileRecord"
						:model-value="modelValue.mediaType"
						density="compact"
						variant="outlined"
						divided
						class="mb-2"
						data-testid="recording-mode-toggle"
						@update:model-value="onMediaTypeChange"
					>
						<VBtn :value="RecordingMediaType.AUDIO" size="small">
							{{ t("components.cardElement.recordingElement.audio") }}
						</VBtn>
						<VBtn :value="RecordingMediaType.VIDEO" size="small">
							{{ t("components.cardElement.recordingElement.video") }}
						</VBtn>
					</VBtnToggle>

					<AudioWaveform
						v-if="!isVideo && (recorder.state.value === 'recording' || fileRecord)"
						:analyser="recorder.state.value === 'recording' ? recorder.analyser.value : undefined"
						:audio-url="recorder.state.value === 'recording' ? undefined : fileRecord?.url"
						:progress="playbackProgress"
						class="mb-2"
						@seek="onSeek"
					/>

					<video
						v-if="isVideo && recorder.state.value === 'recording'"
						ref="preview"
						class="recorder-preview"
						autoplay
						muted
						playsinline
						data-testid="recording-preview"
					/>

					<template v-if="fileRecord">
						<video
							v-if="isVideo"
							:src="fileRecord.url"
							class="recorder-preview"
							controls
							preload="metadata"
							data-testid="recording-player"
						/>
						<audio
							v-else
							ref="player"
							:src="fileRecord.url"
							class="w-100"
							controls
							preload="metadata"
							data-testid="recording-player"
							@timeupdate="onTimeUpdate"
						/>
					</template>

					<VAlert
						v-if="recorder.state.value === 'unsupported'"
						type="info"
						variant="tonal"
						density="compact"
						class="mt-2"
						data-testid="recording-unsupported"
					>
						{{ t("components.cardElement.recordingElement.unsupported") }}
					</VAlert>
					<VAlert
						v-else-if="recorder.state.value === 'denied'"
						type="warning"
						variant="tonal"
						density="compact"
						class="mt-2"
						data-testid="recording-denied"
					>
						{{ t("components.cardElement.recordingElement.denied") }}
					</VAlert>

					<div class="d-flex align-center ga-2 mt-2 flex-wrap">
						<VBtn
							v-if="recorder.state.value !== 'recording'"
							size="small"
							variant="tonal"
							color="error"
							:prepend-icon="mdiRecord"
							:loading="isUploading || recorder.state.value === 'requesting'"
							data-testid="recording-start"
							@click.stop="onStart"
						>
							{{ fileRecord ? t("components.cardElement.recordingElement.again") : t("components.cardElement.recordingElement.start") }}
						</VBtn>
						<template v-else>
							<VBtn size="small" variant="tonal" :prepend-icon="mdiStop" data-testid="recording-stop" @click.stop="onStop">
								{{ t("components.cardElement.recordingElement.stop") }}
							</VBtn>
							<VBtn size="small" variant="text" data-testid="recording-cancel" @click.stop="recorder.cancel">
								{{ t("common.actions.cancel") }}
							</VBtn>
							<span class="text-caption" data-testid="recording-elapsed">{{ elapsedLabel }}</span>
						</template>
					</div>

					<VTextField
						v-if="isEditMode"
						:model-value="modelValue.caption"
						:label="t('components.cardElement.recordingElement.caption')"
						density="compact"
						variant="outlined"
						hide-details
						maxlength="500"
						class="mt-2"
						data-testid="recording-caption-input"
						@update:model-value="onCaptionChange"
					/>
				</div>
			</template>
		</ContentElementBar>
	</VCard>
</template>

<script setup lang="ts">
import AudioWaveform from "./AudioWaveform.vue";
import { useMediaRecorder } from "./useMediaRecorder.composable";
import { FileRecordParent } from "@/types/file/File";
import { askDeletionForType } from "@/utils/confirmation-dialog.utils";
import { RecordingElementResponse, RecordingMediaType } from "@api-server";
import { useBoardFocusHandler, useContentElementState } from "@data-board";
import { useFileStorageApi } from "@data-file";
import { mdiMicrophoneOutline, mdiRecord, mdiStop, mdiVideoOutline } from "@icons/material";
import { BoardMenu, BoardMenuScope, ContentElementBar } from "@ui-board";
import { KebabMenuActionDelete, KebabMenuActionMoveDown, KebabMenuActionMoveUp } from "@ui-kebab-menu";
import { computed, onMounted, ref, toRef, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: RecordingElementResponse;
	isEditMode: boolean;
	isNotFirstElement?: boolean;
	isNotLastElement?: boolean;
	columnIndex: number;
	rowIndex: number;
	elementIndex: number;
}>();

const emit = defineEmits<{
	(e: "delete:element", elementId: string): void;
	(e: "move-down:edit"): void;
	(e: "move-up:edit"): void;
	(e: "move-keyboard:edit", event: KeyboardEvent): void;
}>();

const { t } = useI18n();
const element = toRef(props, "element");

useBoardFocusHandler(element.value.id, ref(null));

const { modelValue } = useContentElementState(props, { autoSaveDebounce: 400 });

const { fetchFiles, upload, getFileRecordsByParentId, deleteFiles } = useFileStorageApi();

const recorder = useMediaRecorder();
const preview = useTemplateRef<HTMLVideoElement>("preview");
const player = useTemplateRef<HTMLAudioElement>("player");
const isUploading = ref(false);
const playbackProgress = ref(0);

const onTimeUpdate = () => {
	const audio = player.value;
	playbackProgress.value = audio && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
};

const onSeek = (ratio: number) => {
	const audio = player.value;
	if (audio && audio.duration > 0) {
		audio.currentTime = ratio * audio.duration;
	}
};

const isVideo = computed(() => element.value.content.mediaType === RecordingMediaType.VIDEO);
const fileRecord = computed(() => getFileRecordsByParentId(element.value.id)[0]);

const elapsedLabel = computed(() => {
	const seconds = recorder.elapsedSeconds.value;

	return `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, "0")}`;
});

onMounted(async () => {
	await fetchFiles(element.value.id, FileRecordParent.BOARDNODES);
});

// The live preview is only attached while recording video; audio has nothing to show.
watch(
	() => recorder.previewStream.value,
	(stream) => {
		if (preview.value) {
			preview.value.srcObject = stream ?? null;
		}
	}
);

const onStart = () => recorder.start(isVideo.value);

const onStop = async () => {
	const blob = await recorder.stop();
	if (!blob) return;

	isUploading.value = true;
	try {
		// A recording element holds exactly one recording. Re-recording therefore deletes the
		// previous file first: otherwise the new take would queue up behind the old one, which
		// is still the one the player shows, and the old file would linger in the storage with
		// nothing pointing at it.
		const previous = getFileRecordsByParentId(element.value.id);
		if (previous.length > 0) {
			await deleteFiles(previous);
		}

		const extension = blob.type.includes("webm") ? "webm" : blob.type.split("/")[1]?.split(";")[0] || "bin";
		// The name has to differ between takes, or a cached URL keeps serving the old audio.
		const name = `${isVideo.value ? "video" : "audio"}-${element.value.id}-${blob.size}.${extension}`;

		await upload(new File([blob], name, { type: blob.type }), element.value.id, FileRecordParent.BOARDNODES);
		await fetchFiles(element.value.id, FileRecordParent.BOARDNODES);
		playbackProgress.value = 0;
	} finally {
		isUploading.value = false;
	}
};

const onMediaTypeChange = (value: RecordingMediaType | null) => {
	if (value === null) return;

	modelValue.value.mediaType = value;
};

const onCaptionChange = (value: string) => {
	modelValue.value.caption = value;
};

const onDelete = async () => {
	const shouldDelete = await askDeletionForType("boardElement");
	if (shouldDelete) {
		emit("delete:element", element.value.id);
	}
};

const onMoveDown = () => emit("move-down:edit");
const onMoveUp = () => emit("move-up:edit");
</script>

<style lang="scss" scoped>
.recorder-preview {
	width: 100%;
	max-height: 240px;
	border-radius: 4px;
	background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
