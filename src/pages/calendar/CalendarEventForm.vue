<template>
	<VDialog :model-value="modelValue" max-width="560" @update:model-value="emit('update:modelValue', $event)">
		<VCard data-testid="calendar-event-form">
			<VCardTitle>{{ event ? t("pages.calendar.form.editTitle") : t("pages.calendar.form.createTitle") }}</VCardTitle>
			<VCardText>
				<VForm ref="form" @submit.prevent="save">
					<VTextField
						v-model="summary"
						:label="t('pages.calendar.form.title')"
						:placeholder="t('pages.calendar.form.titlePlaceholder')"
						:rules="[required]"
						data-testid="calendar-form-title"
					/>
					<div class="d-flex ga-3 flex-wrap">
						<VTextField
							v-model="startDate"
							type="datetime-local"
							:label="t('pages.calendar.form.from')"
							:rules="[required]"
							data-testid="calendar-form-start"
						/>
						<VTextField
							v-model="endDate"
							type="datetime-local"
							:label="t('pages.calendar.form.to')"
							:rules="[required, endAfterStart]"
							data-testid="calendar-form-end"
						/>
					</div>
					<VTextarea
						v-model="description"
						:label="t('pages.calendar.form.description')"
						rows="3"
						data-testid="calendar-form-description"
					/>
					<VTextField
						v-model="location"
						:label="t('pages.calendar.form.location')"
						:placeholder="t('pages.calendar.form.locationPlaceholder')"
						data-testid="calendar-form-location"
					/>
				</VForm>
			</VCardText>
			<VCardActions>
				<VSpacer />
				<VBtn variant="text" data-testid="calendar-form-cancel" @click="emit('update:modelValue', false)">
					{{ t("common.actions.cancel") }}
				</VBtn>
				<VBtn color="primary" variant="flat" :loading="saving" data-testid="calendar-form-save" @click="save">
					{{ t("common.actions.save") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { CalendarEventInput, DashboardCalendarEvent, useCalendarEventMutations } from "@data-access";
import { notifyError, useAppStore } from "@data-app";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	modelValue: boolean;
	/** The event to edit; a new one is created without it. */
	event?: DashboardCalendarEvent;
}>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void; (e: "saved"): void }>();

const { t } = useI18n();
const { createEvent, updateEvent } = useCalendarEventMutations();
const appStore = useAppStore();

const summary = ref("");
const startDate = ref("");
const endDate = ref("");
const description = ref("");
const location = ref("");
const saving = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

/** `YYYY-MM-DDTHH:mm` in local time, for the datetime-local inputs. */
const toLocalInput = (date: Date) => {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

watch(
	() => [props.modelValue, props.event] as const,
	([open, event]) => {
		if (!open) return;
		const start = event?.startsAt ?? new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
		summary.value = event?.title ?? "";
		startDate.value = toLocalInput(start);
		endDate.value = toLocalInput(event?.endsAt ?? new Date(start.getTime() + 3_600_000));
		description.value = event?.description ?? "";
		location.value = event?.location ?? "";
	},
	{ immediate: true }
);

const required = (value: string) => value.trim() !== "" || t("pages.calendar.form.required");
const endAfterStart = (value: string) =>
	new Date(value) > new Date(startDate.value) || t("pages.calendar.form.endBeforeStart");

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	const input: CalendarEventInput = {
		summary: summary.value.trim(),
		startDate: new Date(startDate.value).toISOString(),
		endDate: new Date(endDate.value).toISOString(),
		description: description.value,
		location: location.value,
	};
	const userId = appStore.user?.id ?? "";
	saving.value = true;
	try {
		if (props.event) await updateEvent(props.event.id, input, userId);
		else await createEvent(input, userId);
		emit("saved");
		emit("update:modelValue", false);
	} catch {
		notifyError(t("pages.calendar.form.error"));
	} finally {
		saving.value = false;
	}
};
</script>
