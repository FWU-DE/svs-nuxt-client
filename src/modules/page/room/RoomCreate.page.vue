<template>
	<DefaultWireframe :max-width="isPickerStep ? 'limited' : 'short'" :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="page-title">{{ headline }}</h1>
		</template>

		<div v-if="isCreating" data-testid="room-template-progress">
			<p class="text-body-1 mb-4">{{ t("pages.roomCreate.templates.applying") }}</p>
			<VProgressLinear class="mb-6" :model-value="progress" color="primary" height="8" rounded />
			<RoomTemplateStructure :boards="boards" show-progress :created-keys="createdKeys" />
		</div>

		<template v-else-if="isPickerStep">
			<RoomAiPrompt v-if="isAiEnabled" :is-generating="isGenerating" @generate="onGenerate" />
			<RoomTemplatePicker @select="onSelectTemplate" />
		</template>

		<template v-else-if="isAiPreviewStep">
			<VAlert v-if="hasFailed" type="error" variant="tonal" class="mb-6" data-testid="room-ai-error">
				{{ t("pages.roomCreate.ai.error") }}
			</VAlert>
			<p class="text-body-2 text-medium-emphasis mb-4">{{ t("pages.roomCreate.ai.preview") }}</p>
			<RoomTemplateStructure :boards="aiBoards" />
			<VProgressLinear v-if="isGenerating" indeterminate color="primary" class="mb-6" />
			<div class="d-flex ga-3 flex-wrap">
				<VBtn variant="text" data-testid="room-ai-discard-btn" @click="onDiscardAiResult">
					{{ t("pages.roomCreate.ai.discard") }}
				</VBtn>
				<VSpacer />
				<VBtn
					color="primary"
					variant="flat"
					:disabled="isGenerating || aiBoards.length === 0"
					data-testid="room-ai-accept-btn"
					@click="onAcceptAiResult"
				>
					{{ t("pages.roomCreate.ai.accept") }}
				</VBtn>
			</div>
		</template>

		<template v-else>
			<RoomTemplateSummary
				v-if="selectedTemplate"
				:template="selectedTemplate"
				:boards="boards"
				@change="onBackToPicker"
			/>
			<VSheet v-else border rounded class="pa-4 mb-8" data-testid="room-ai-summary">
				<div class="d-flex align-center ga-4 mb-2">
					<VAvatar rounded="lg" color="primary">
						<VIcon :icon="mdiCreation" color="white" />
					</VAvatar>
					<div class="text-body-1 font-weight-bold">{{ t("pages.roomCreate.ai.title") }}</div>
					<VSpacer />
					<VBtn variant="text" color="primary" data-testid="room-ai-change-btn" @click="onBackToPicker">
						{{ t("pages.roomCreate.templates.change") }}
					</VBtn>
				</div>
				<RoomTemplateStructure :boards="boards" />
			</VSheet>
			<RoomTemplateParams v-if="selectedTemplate" v-model:values="paramValues" :template="selectedTemplate" />
			<RoomForm :room="roomData" @save="onSave" @cancel="onCancel" />
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { ApiResponseError } from "@/types/common/commons";
import { RoomColor, RoomCreateParams } from "@/types/room/Room";
import { buildPageTitle } from "@/utils/pageTitle";
import { RoomFeatures } from "@api-server";
import { notifyError } from "@data-app";
import { useEnvConfig } from "@data-env";
import {
	defaultParamValues,
	resolveRoomName,
	resolveTemplate,
	RoomTemplate,
	RoomTemplateParamValues,
	useRoomAiTemplate,
	useRoomStore,
	useRoomTemplate,
} from "@data-room";
import {
	RoomAiPrompt,
	RoomForm,
	RoomTemplateParams,
	RoomTemplatePicker,
	RoomTemplateStructure,
	RoomTemplateSummary,
} from "@feature-room";
import { mdiCreation } from "@icons/material";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

type CreateStep = "picker" | "aiPreview" | "form";

const { t } = useI18n();

const router = useRouter();

const roomData = ref<RoomCreateParams>({
	name: "",
	color: RoomColor.BLUE_GREY,
	features: [],
});

const { createRoom } = useRoomStore();
const { applyTemplate, createdKeys, progress } = useRoomTemplate();
const {
	boards: aiBoards,
	generate,
	hasFailed,
	hasVideoConference,
	isGenerating,
	reset: resetAiResult,
	roomName: aiRoomName,
} = useRoomAiTemplate();

const step = ref<CreateStep>("picker");
const selectedTemplate = ref<RoomTemplate>();
const paramValues = ref<RoomTemplateParamValues>({});
const isCreating = ref(false);

const isAiEnabled = computed(() => useEnvConfig().value.FEATURE_ROOM_AI_TEMPLATE_ENABLED);
const isPickerStep = computed(() => step.value === "picker");
const isAiPreviewStep = computed(() => step.value === "aiPreview");

/** the structure that will be created: either the resolved template or the suggestion of the ai */
const boards = computed(() =>
	selectedTemplate.value ? resolveTemplate(selectedTemplate.value, paramValues.value, t) : aiBoards.value
);

const suggestedRoomName = computed(() =>
	selectedTemplate.value ? resolveRoomName(selectedTemplate.value, paramValues.value, t) : aiRoomName.value
);

// the suggested name follows the params until the user typed a name of their own
watch(suggestedRoomName, (suggestion, previousSuggestion) => {
	if (roomData.value.name === previousSuggestion) roomData.value.name = suggestion;
});

const headline = computed(() => {
	if (isPickerStep.value) return t("pages.roomCreate.templates.title");
	if (isAiPreviewStep.value) return t("pages.roomCreate.ai.title");
	return t("pages.rooms.fab.title");
});

const pageTitle = computed(() => buildPageTitle(`${t("pages.roomCreate.title")}`));
useTitle(pageTitle);

const breadcrumbs: Breadcrumb[] = [
	{
		title: t("pages.rooms.title"),
		to: "/rooms",
	},
	{
		title: t("pages.rooms.fab.title"),
		disabled: true,
	},
];

const onSelectTemplate = (template: RoomTemplate) => {
	resetAiResult();
	selectedTemplate.value = template;
	paramValues.value = defaultParamValues(template);
	roomData.value = {
		name: suggestedRoomName.value,
		color: template.color,
		features: [...template.features],
	};
	step.value = "form";
};

const onGenerate = async (prompt: string) => {
	selectedTemplate.value = undefined;
	step.value = "aiPreview";
	await generate(prompt);
};

const onAcceptAiResult = () => {
	roomData.value = {
		name: aiRoomName.value,
		color: RoomColor.BLUE_GREY,
		// a suggested video conference is worthless unless editors may manage one
		features: hasVideoConference.value ? [RoomFeatures.EDITOR_MANAGE_VIDEOCONFERENCE] : [],
	};
	step.value = "form";
};

const onDiscardAiResult = () => {
	resetAiResult();
	step.value = "picker";
};

const onBackToPicker = () => {
	step.value = "picker";
};

const onSave = async (payload: { room: RoomCreateParams }) => {
	isCreating.value = true;
	const { result: room, error } = await createRoom(payload.room);

	if (error || !room) {
		isCreating.value = false;
		if (error && isInvalidRequestError(error)) {
			notifyError(t("components.roomForm.validation.generalSaveError"));
		}
		return;
	}

	const isComplete = await applyTemplate(room.data.id, boards.value);
	if (!isComplete) notifyError(t("pages.roomCreate.templates.applyError"));

	router.push({ name: "room-details", params: { id: room.data.id } });
};

const isInvalidRequestError = (error: unknown): boolean => {
	const apiError = error as ApiResponseError;
	return apiError.code === 400;
};

const onCancel = () => {
	router.push({
		name: "rooms",
	});
};
</script>
