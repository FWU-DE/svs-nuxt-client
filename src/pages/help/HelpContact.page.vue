<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="help-contact-title">{{ t("pages.helpContact.title") }}</h1>
		</template>

		<VCard variant="outlined">
			<VCardText>
				<VBtnToggle v-model="type" mandatory class="mb-6" data-testid="help-contact-type">
					<VBtn value="problem">{{ t("pages.helpContact.problem") }}</VBtn>
					<VBtn value="wish">{{ t("pages.helpContact.wish") }}</VBtn>
				</VBtnToggle>

				<VForm data-testid="help-contact-form" @submit.prevent="submit">
					<VSelect
						v-model="problemArea"
						:items="problemAreas"
						:label="t('pages.helpContact.problemArea')"
						multiple
						required
						data-testid="help-contact-problem-area"
					/>
					<VTextField
						v-model="subject"
						:label="t('pages.helpContact.subject')"
						required
						data-testid="help-contact-subject"
					/>
					<VTextarea
						v-if="type === 'problem'"
						v-model="problemDescription"
						:label="t('pages.helpContact.problemDescription')"
						required
						data-testid="help-contact-problem-description"
					/>
					<template v-else>
						<VTextField v-model="role" :label="t('pages.helpContact.role')" required data-testid="help-contact-role" />
						<VTextarea
							v-model="desire"
							:label="t('pages.helpContact.desire')"
							required
							data-testid="help-contact-desire"
						/>
						<VTextarea
							v-model="benefit"
							:label="t('pages.helpContact.benefit')"
							required
							data-testid="help-contact-benefit"
						/>
						<VTextarea
							v-model="acceptanceCriteria"
							:label="t('pages.helpContact.acceptanceCriteria')"
							data-testid="help-contact-acceptance"
						/>
					</template>
					<VTextField v-model="device" :label="t('pages.helpContact.device')" data-testid="help-contact-device" />
					<VTextField
						v-model="replyEmail"
						:label="t('pages.helpContact.replyEmail')"
						type="email"
						required
						data-testid="help-contact-email"
					/>
					<VCheckbox v-model="consent" :label="t('pages.helpContact.consent')" data-testid="help-contact-consent" />
					<VBtn color="primary" variant="flat" type="submit" :loading="isSubmitting" data-testid="help-contact-submit">
						{{ t("common.actions.send") }}
					</VBtn>
				</VForm>
			</VCardText>
		</VCard>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import {
	HelpdeskApiFactory,
	HelpdeskProblemCreateParams,
	HelpdeskProblemCreateParamsSupportType,
	HelpdeskWishCreateParams,
	HelpdeskWishCreateParamsSupportType,
} from "@api-server";
import { notifyError, notifySuccess } from "@data-app";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const helpdeskApi = HelpdeskApiFactory(undefined, "/v3", $axios);

useTitle(buildPageTitle(t("pages.helpContact.title")));

const type = ref<"problem" | "wish">("problem");
const problemArea = ref<string[]>([]);
const subject = ref("");
const problemDescription = ref("");
const role = ref("");
const desire = ref("");
const benefit = ref("");
const acceptanceCriteria = ref("");
const device = ref("");
const replyEmail = ref("");
const consent = ref(true);
const isSubmitting = ref(false);

const problemAreas = computed(() => [
	"Aufgaben",
	"Authentifizierung",
	"Bereiche",
	"Dateien",
	"Datenschutz",
	"Externe Tools",
	"Hilfebereich",
	"Kommunikation",
	"Kurse",
	"Mobile Nutzung",
	"Neuigkeiten",
	"Räume",
	"Sonstige",
	"Teams",
	"Termine",
	"Tools",
	"Übersicht",
	"Verwaltung",
	"Zusatzangebote",
]);

const reset = () => {
	problemArea.value = [];
	subject.value = "";
	problemDescription.value = "";
	role.value = "";
	desire.value = "";
	benefit.value = "";
	acceptanceCriteria.value = "";
	device.value = "";
	replyEmail.value = "";
	consent.value = true;
};

const submit = async () => {
	isSubmitting.value = true;
	try {
		if (type.value === "problem") {
			const payload: HelpdeskProblemCreateParams = {
				supportType: HelpdeskProblemCreateParamsSupportType.PROBLEM,
				subject: subject.value,
				replyEmail: replyEmail.value,
				problemArea: problemArea.value,
				device: device.value || undefined,
				consent: consent.value,
				problemDescription: problemDescription.value,
			};
			await helpdeskApi.helpdeskControllerCreateProblem(navigator.userAgent, payload);
		} else {
			const payload: HelpdeskWishCreateParams = {
				supportType: HelpdeskWishCreateParamsSupportType.WISH,
				subject: subject.value,
				replyEmail: replyEmail.value,
				problemArea: problemArea.value,
				device: device.value || undefined,
				consent: consent.value,
				role: role.value,
				desire: desire.value,
				benefit: benefit.value,
				acceptanceCriteria: acceptanceCriteria.value || undefined,
			};
			await helpdeskApi.helpdeskControllerCreateWish(navigator.userAgent, payload);
		}
		notifySuccess(t("pages.helpContact.sent"));
		reset();
	} catch {
		notifyError(t("pages.helpContact.sendError"));
	} finally {
		isSubmitting.value = false;
	}
};
</script>
