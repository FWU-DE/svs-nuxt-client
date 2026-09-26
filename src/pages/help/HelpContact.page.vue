<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="help-contact-title">{{ t("pages.helpContact.title") }}</h1>
		</template>

		<LegacyIconCard :title="t('pages.helpContact.formTitle')" :icon="mdiPencil" test-id="help-contact-card">
			<fieldset class="feedback-kind text-center mb-6">
				<legend class="mb-2">{{ t("pages.helpContact.feedbackKind") }}</legend>
				<VBtnToggle
					v-model="type"
					mandatory
					color="primary"
					variant="outlined"
					divided
					class="kind-toggle"
					data-testid="help-contact-type"
				>
					<VBtn value="problem" class="flex-grow-1">{{ t("pages.helpContact.problem") }}</VBtn>
					<VBtn value="wish" class="flex-grow-1">{{ t("pages.helpContact.wish") }}</VBtn>
				</VBtnToggle>
			</fieldset>

			<VForm data-testid="help-contact-form" @submit.prevent="submit">
				<h3 class="section-title">{{ t("pages.helpContact.topicTitle") }}</h3>
				<p class="text-center mb-4">{{ t("pages.helpContact.whichArea", { themeTitle }) }}</p>
				<div class="topic-select mx-auto mb-6">
					<div class="d-flex justify-space-between mb-1">
						<span class="font-weight-bold">
							<VIcon :icon="mdiInformation" size="small" color="info" />{{ t("pages.helpContact.severalTopics") }}
						</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
					</div>
					<VSelect
						v-model="problemArea"
						:items="problemAreas"
						:placeholder="t('pages.helpContact.problemArea')"
						multiple
						chips
						variant="outlined"
						density="compact"
						hide-details="auto"
						:rules="[(v: string[]) => v.length > 0 || t('pages.helpContact.noProblemArea')]"
						data-testid="help-contact-problem-area"
					/>
				</div>

				<template v-if="type === 'problem'">
					<p class="font-weight-bold mb-1">{{ t("pages.helpContact.knownTitle") }}</p>
					<p>{{ t("pages.helpContact.knownText") }} {{ t("pages.helpContact.knownStatus") }}</p>
					<iframe
						class="known-problems mb-6"
						src="https://docs.dbildungscloud.de/display/SCDOK/Bekannte+Fehler+in+der+Cloud+und+ihre+Behebung?frameable=true"
						:title="t('pages.helpContact.knownTitle')"
						data-testid="help-contact-known-problems"
					/>
				</template>

				<h3 class="section-title">{{ t("pages.helpContact.supportTitle") }}</h3>
				<p class="text-center mb-4">
					{{ type === "problem" ? t("pages.helpContact.supportSubtitle") : t("pages.helpContact.supportSubtitleWish") }}
				</p>

				<template v-if="type === 'problem'">
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.subject") }}</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
						<VTextField
							v-model="subject"
							:placeholder="t('pages.helpContact.subject')"
							variant="outlined"
							density="compact"
							hide-details="auto"
							required
							data-testid="help-contact-subject"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.problemDescription") }}</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
						<VTextarea
							v-model="problemDescription"
							rows="14"
							variant="outlined"
							density="compact"
							hide-details="auto"
							required
							data-testid="help-contact-problem-description"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.device") }}</span>
						<VTextField
							v-model="device"
							placeholder="z.B. iPhone X, Samsung Galaxy S10"
							variant="outlined"
							density="compact"
							hide-details="auto"
							data-testid="help-contact-device"
						/>
					</label>
				</template>
				<template v-else>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.subjectWish") }}</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
						<VTextField
							v-model="subject"
							:placeholder="t('pages.helpContact.subjectWish')"
							variant="outlined"
							density="compact"
							hide-details="auto"
							required
							data-testid="help-contact-subject"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.role") }}</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
						<VTextField
							v-model="role"
							:placeholder="t('pages.helpContact.rolePlaceholder')"
							variant="outlined"
							density="compact"
							hide-details="auto"
							required
							data-testid="help-contact-role"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.desire") }}</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
						<VTextarea
							v-model="desire"
							:placeholder="t('pages.helpContact.desirePlaceholder')"
							rows="14"
							variant="outlined"
							density="compact"
							hide-details="auto"
							required
							data-testid="help-contact-desire"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.benefit") }}</span>
						<span class="required-label">{{ t("pages.helpContact.required") }}</span>
						<VTextarea
							v-model="benefit"
							:placeholder="t('pages.helpContact.benefitPlaceholder')"
							rows="14"
							variant="outlined"
							density="compact"
							hide-details="auto"
							required
							data-testid="help-contact-benefit"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.acceptanceCriteria") }}</span>
						<VTextarea
							v-model="acceptanceCriteria"
							:placeholder="t('pages.helpContact.acceptancePlaceholder')"
							rows="14"
							variant="outlined"
							density="compact"
							hide-details="auto"
							data-testid="help-contact-acceptance"
						/>
					</label>
					<label class="form-group d-block mb-4">
						<span class="control-label">{{ t("pages.helpContact.deviceWish") }}</span>
						<VTextField
							v-model="device"
							placeholder="z.B. iPhone X, Samsung Galaxy S10"
							variant="outlined"
							density="compact"
							hide-details="auto"
							data-testid="help-contact-device"
						/>
					</label>
				</template>
				<label class="form-group d-block mb-4">
					<span class="control-label">{{ t("pages.helpContact.replyEmail") }}</span>
					<span class="required-label">{{ t("pages.helpContact.required") }}</span>
					<VTextField
						v-model="replyEmail"
						:placeholder="t('pages.helpContact.emailPlaceholder')"
						variant="outlined"
						density="compact"
						hide-details="auto"
						required
						type="email"
						data-testid="help-contact-email"
					/>
				</label>

				<fieldset class="mb-4">
					<legend class="control-label mb-1">{{ t("pages.helpContact.furtherInformation") }}</legend>
					<VCheckbox v-model="consent" hide-details density="compact" data-testid="help-contact-consent">
						<template #label>
							<span>
								{{ type === "problem" ? t("pages.helpContact.consent") : t("pages.helpContact.consentWish") }}
								<ul class="consent-list">
									<li>{{ t("pages.helpContact.consentBrowser") }}</li>
									<li>{{ t("pages.helpContact.consentOs") }}</li>
								</ul>
							</span>
						</template>
					</VCheckbox>
				</fieldset>

				<VDivider class="mb-4" />
				<VBtn variant="outlined" type="submit" :loading="isSubmitting" data-testid="help-contact-submit">
					{{ t("pages.helpContact.submit") }}
				</VBtn>
			</VForm>
		</LegacyIconCard>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import LegacyIconCard from "@/components/legacy/LegacyIconCard.vue";
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
import { useEnvConfig } from "@data-env";
import { mdiInformation, mdiPencil } from "@icons/material";
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

const themeTitle = computed(() => useEnvConfig().value.SC_TITLE);

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

<style lang="scss" scoped>
// Layout of the legacy contact form (views/help/contact-card.hbs, forms/form_bug.hbs).
fieldset {
	border: 0;
}

// The legacy switch: primary outline, the chosen half filled, labels in capitals.
.kind-toggle {
	width: min(100%, 480px);
	border-color: rgb(var(--v-theme-primary));

	:deep(.v-btn) {
		text-transform: uppercase;
		font-weight: 400;
	}

	:deep(.v-btn--active) {
		background: rgb(var(--v-theme-primary));
		color: rgb(var(--v-theme-on-primary)) !important;

		.v-btn__overlay {
			opacity: 0;
		}
	}
}

.section-title {
	position: relative;
	padding: 15px 5px 5px;
	margin: 1.5rem 0 0.75rem;
	text-align: center;
	font-size: 1.9rem;
	font-weight: 400;
	border-bottom: 1px solid #333;
}

.topic-select {
	max-width: 50%;

	.required-label {
		font-weight: normal;
	}
}

.control-label {
	font-weight: bold;
}

.required-label {
	margin-left: 0.5rem;
	opacity: 0.7;
}

.known-problems {
	width: 100%;
	min-height: 500px;
	border: 0.75rem solid #f5f5f5;
}

.consent-list {
	padding-left: 1.25rem;
}
</style>
