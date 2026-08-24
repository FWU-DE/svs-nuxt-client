<template>
	<DefaultWireframe :max-width="isTemplateStep ? 'limited' : 'short'" :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="page-title">
				{{ isTemplateStep ? t("pages.roomCreate.templates.title") : t("pages.rooms.fab.title") }}
			</h1>
		</template>

		<div v-if="isCreating" class="d-flex flex-column align-center py-16" data-testid="room-template-progress">
			<p class="text-body-1 mb-4">{{ t("pages.roomCreate.templates.applying") }}</p>
			<VProgressLinear class="room-template-progress-bar" :model-value="progress" color="primary" height="8" rounded />
		</div>

		<RoomTemplatePicker v-else-if="isTemplateStep" @select="onSelectTemplate" />

		<template v-else>
			<RoomTemplateSummary v-if="selectedTemplate" :template="selectedTemplate" @change="onChangeTemplate" />
			<RoomForm :room="roomData" @save="onSave" @cancel="onCancel" />
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { ApiResponseError } from "@/types/common/commons";
import { RoomColor, RoomCreateParams } from "@/types/room/Room";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError } from "@data-app";
import { RoomTemplate, useRoomStore, useRoomTemplate } from "@data-room";
import { RoomForm, RoomTemplatePicker, RoomTemplateSummary } from "@feature-room";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
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
const { applyTemplate, progress } = useRoomTemplate();

const selectedTemplate = ref<RoomTemplate>();
const isTemplateStep = ref(true);
const isCreating = ref(false);

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
	roomData.value = {
		name: template.roomNameKey ? t(template.roomNameKey) : "",
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

	if (selectedTemplate.value) {
		const isComplete = await applyTemplate(room.data.id, selectedTemplate.value);
		if (!isComplete) notifyError(t("pages.roomCreate.templates.applyError"));
	}

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

<style lang="scss" scoped>
.room-template-progress-bar {
	max-width: 400px;
}
</style>
