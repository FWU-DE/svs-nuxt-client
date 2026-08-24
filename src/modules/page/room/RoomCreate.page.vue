<template>
	<DefaultWireframe :max-width="isTemplateStep ? 'limited' : 'short'" :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="page-title">
				{{ isTemplateStep ? t("pages.roomCreate.templates.title") : t("pages.rooms.fab.title") }}
			</h1>
		</template>

		<div v-if="isCreating" data-testid="room-template-progress">
			<p class="text-body-1 mb-4">{{ t("pages.roomCreate.templates.applying") }}</p>
			<VProgressLinear class="mb-6" :model-value="progress" color="primary" height="8" rounded />
			<RoomTemplateStructure :boards="resolvedBoards" show-progress :created-keys="createdKeys" />
		</div>

		<RoomTemplatePicker v-else-if="isTemplateStep" @select="onSelectTemplate" />

		<template v-else-if="selectedTemplate">
			<RoomTemplateSummary :template="selectedTemplate" :boards="resolvedBoards" @change="onChangeTemplate" />
			<RoomTemplateParams v-model:values="paramValues" :template="selectedTemplate" />
			<RoomForm :room="roomData" @save="onSave" @cancel="onCancel" />
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { ApiResponseError } from "@/types/common/commons";
import { RoomColor, RoomCreateParams } from "@/types/room/Room";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError } from "@data-app";
import {
	defaultParamValues,
	resolveRoomName,
	resolveTemplate,
	RoomTemplate,
	RoomTemplateParamValues,
	useRoomStore,
	useRoomTemplate,
} from "@data-room";
import {
	RoomForm,
	RoomTemplateParams,
	RoomTemplatePicker,
	RoomTemplateStructure,
	RoomTemplateSummary,
} from "@feature-room";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();

const router = useRouter();

const roomData = ref<RoomCreateParams>({
	name: "",
	color: RoomColor.BLUE_GREY,
	features: [],
});

const { createRoom } = useRoomStore();
const { applyTemplate, createdKeys, progress } = useRoomTemplate();

const selectedTemplate = ref<RoomTemplate>();
const paramValues = ref<RoomTemplateParamValues>({});
const isTemplateStep = ref(true);
const isCreating = ref(false);

const resolvedBoards = computed(() =>
	selectedTemplate.value ? resolveTemplate(selectedTemplate.value, paramValues.value, t) : []
);

const suggestedRoomName = computed(() =>
	selectedTemplate.value ? resolveRoomName(selectedTemplate.value, paramValues.value, t) : ""
);

// the suggested name follows the params until the user typed a name of their own
watch(suggestedRoomName, (suggestion, previousSuggestion) => {
	if (roomData.value.name === previousSuggestion) roomData.value.name = suggestion;
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
	selectedTemplate.value = template;
	paramValues.value = defaultParamValues(template);
	roomData.value = {
		name: suggestedRoomName.value,
		color: template.color,
		features: [...template.features],
	};
	isTemplateStep.value = false;
};

const onChangeTemplate = () => {
	isTemplateStep.value = true;
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

	const isComplete = await applyTemplate(room.data.id, resolvedBoards.value);
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
