<template>
	<div v-if="template.params.length > 0" class="mb-6" data-testid="room-template-params">
		<div class="text-subtitle-2 mb-2">{{ t("pages.roomCreate.templates.params.title") }}</div>
		<VRow dense>
			<VCol v-for="param in template.params" :key="param.key" cols="12" sm="6">
				<VTextField
					:model-value="values[param.key]"
					:label="t(param.labelKey)"
					:type="param.type === 'number' ? 'number' : 'text'"
					:min="param.min"
					:max="param.max"
					density="comfortable"
					hide-details="auto"
					:data-testid="`room-template-param-${param.key}`"
					@update:model-value="onUpdate(param, $event)"
				/>
			</VCol>
		</VRow>
	</div>
</template>

<script setup lang="ts">
import { RoomTemplate, RoomTemplateParam, RoomTemplateParamValues } from "@data-room";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

defineProps({
	template: {
		type: Object as PropType<RoomTemplate>,
		required: true,
	},
});

const values = defineModel("values", {
	type: Object as PropType<RoomTemplateParamValues>,
	required: true,
});

const { t } = useI18n();

const clampedNumber = (param: RoomTemplateParam, value: string) => {
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) return param.min ?? 1;

	const atLeast = param.min === undefined ? parsed : Math.max(parsed, param.min);
	return param.max === undefined ? atLeast : Math.min(atLeast, param.max);
};

const onUpdate = (param: RoomTemplateParam, value: string) => {
	values.value = {
		...values.value,
		[param.key]: param.type === "number" ? clampedNumber(param, value) : value,
	};
};
</script>
