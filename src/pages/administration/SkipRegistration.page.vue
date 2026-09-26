<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 class="noprint" data-testid="skip-registration-title">{{ title }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<div v-if="done" class="users-register-complete" data-testid="registration-complete">
				<p class="noprint">
					{{
						t("legacy.administration.users_registrationComplete.text.registrationPossibleWithFollowingData", {
							shortTitle: themeTitle,
						})
					}}
				</p>
				<p class="noprint">
					<RenderHTML :html="t('legacy.administration.users_registrationComplete.text.cannotCallPageAgain')" />
				</p>
				<div class="d-flex justify-center mb-4 noprint">
					<VBtn
						color="primary"
						variant="flat"
						:prepend-icon="mdiPrinter"
						data-testid="print-credentials"
						@click="print"
					>
						{{ t("legacy.administration.button.printListWithAccessData") }}
					</VBtn>
				</div>
				<div class="printonly">
					<h1>{{ done.fullname }}</h1>
					<p>
						<RenderHTML
							:html="
								t('legacy.administration.users_registrationComplete.text.loginWithPassword', {
									shortTitle: themeTitle,
									origin,
								})
							"
						/>
					</p>
				</div>
				<VTextarea
					:model-value="credentials"
					readonly
					auto-grow
					rows="3"
					variant="outlined"
					data-testid="skip-registration-credentials"
				/>
				<p class="noprint mt-4">
					{{ t("legacy.administration.users_registrationComplete.text.whenLoginForTheFirstTime") }}
				</p>
				<div class="d-flex justify-end noprint">
					<VBtn color="primary" variant="flat" to="/administration/students" data-testid="registration-complete-done">
						{{ t("legacy.global.button.done") }}
					</VBtn>
				</div>
			</div>

			<VForm v-else-if="user" ref="form" data-testid="skip-registration-form" @submit.prevent="submit">
				<VRow>
					<VCol cols="12" md="6">
						<VTextField
							:model-value="user.firstName"
							:label="`${t('legacy.global.label.firstNameColon')} *`"
							readonly
							data-testid="skip-first-name"
						/>
					</VCol>
					<VCol cols="12" md="6">
						<VTextField
							:model-value="user.lastName"
							:label="`${t('legacy.global.label.lastNameColon')} *`"
							readonly
							data-testid="skip-last-name"
						/>
					</VCol>
				</VRow>
				<VTextField
					:model-value="user.email"
					type="email"
					:label="`${t('legacy.global.label.emailAddress')} *`"
					readonly
					data-testid="skip-email"
				/>
				<VTextField
					v-model="birthday"
					type="date"
					:label="`${t('legacy.global.label.dateOfBirth')} *`"
					:min="minBirthday"
					:max="maxBirthday"
					:rules="[required]"
					data-testid="skip-birthday"
				/>
				<VTextField
					v-model="password"
					:label="`${t('legacy.administration.global.label.assignPassword')} *`"
					placeholder="***************"
					:rules="[required]"
					data-testid="skip-password"
				/>

				<p class="font-weight-bold mb-1">
					{{ t("legacy.administration.users_skipRegistration.text.youGiveTheFollowingConsent") }}
				</p>
				<VRow data-testid="consents-overview">
					<VCol v-for="part in parts" :key="part.key" cols="12" md="6">
						<p class="mb-1">{{ part.label }}</p>
						<VRadioGroup v-model="part.model.form" inline hide-details>
							<VRadio :label="t('legacy.administration.label.analog')" value="analog" />
							<VRadio :label="t('legacy.administration.label.digital')" value="digital" />
						</VRadioGroup>
						<VCheckbox
							v-model="part.model.privacyConsent"
							:label="t('legacy.administration.global.label.dataProtection')"
							hide-details
							density="compact"
							:data-testid="`${part.key}-privacy-consent`"
						/>
						<VCheckbox
							v-model="part.model.termsOfUseConsent"
							:label="t('legacy.administration.global.label.termsOfUse')"
							hide-details
							density="compact"
							:data-testid="`${part.key}-terms-consent`"
						/>
					</VCol>
				</VRow>

				<div class="d-flex justify-end ga-2 mt-6">
					<VBtn variant="text" data-testid="skip-registration-cancel" @click="leave">
						{{ t("legacy.global.button.cancel") }}
					</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="submit_consent">
						{{ t("legacy.administration.controller.link.toGiveConsent") }}
					</VBtn>
				</div>
			</VForm>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// "Einverständnis auf Papier erhalten" for an imported student (legacy
// views/administration/users_skipregistration.hbs, then users_registrationcomplete.hbs): analog
// consents, birthday and a start password finish the registration; the credentials are shown once.
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { generateConsentPassword, useLegacyUserImportApi } from "@/composables/legacy-user-import.api";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError } from "@data-app";
import { useEnvConfig } from "@data-env";
import { RenderHTML } from "@feature-render-html";
import { mdiPrinter } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import dayjs from "dayjs";
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

type Consent = { form: string; privacyConsent: boolean; termsOfUseConsent: boolean };
type Student = { _id: string; firstName: string; lastName: string; email: string; birthday?: string };

// `CONSENT_WITHOUT_PARENTS_MIN_AGE_YEARS` of the legacy client.
const CONSENT_WITHOUT_PARENTS_MIN_AGE_YEARS = 16;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useLegacyUserImportApi();

const userId = computed(() => String(route.params.id));
const themeTitle = computed(() => useEnvConfig().value.SC_TITLE ?? "");
const origin = window.location.origin;

const user = ref<Student>();
const birthday = ref("");
const password = ref(generateConsentPassword());
const parentConsent = reactive<Consent>({ form: "analog", privacyConsent: true, termsOfUseConsent: true });
const studentConsent = reactive<Consent>({ form: "analog", privacyConsent: true, termsOfUseConsent: true });
const saving = ref(false);
const done = ref<{ fullname: string; email: string; password: string }>();
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

const minBirthday = dayjs().subtract(100, "year").format("YYYY-MM-DD");
const maxBirthday = dayjs().subtract(4, "year").format("YYYY-MM-DD");
const required = (value: string) => !!value?.trim() || t("pages.legacyPages.required");

const title = computed(() =>
	done.value
		? t("legacy.administration.controller.text.agreementSuccessfullyDeclared")
		: t("legacy.administration.controller.link.toGiveConsent")
);

const parts = computed(() => [
	{
		key: "parent",
		label: t("legacy.administration.global.text.forStudentsUnder", { minAge: CONSENT_WITHOUT_PARENTS_MIN_AGE_YEARS }),
		model: parentConsent,
	},
	{
		key: "student",
		label: t("legacy.administration.users_skipRegistration.text.forStudentsAged14"),
		model: studentConsent,
	},
]);

const credentials = computed(() =>
	done.value
		? `${done.value.fullname}\nE-Mail: ${done.value.email}\n${t("legacy.global.label.password")} ${done.value.password}`
		: ""
);

const { loadingState } = useSafeAxiosRunner(async () => {
	const { data } = await $axios.get<Student>(`/v3/users/admin/students/${userId.value}`);
	user.value = data;
	birthday.value = data.birthday ? dayjs(data.birthday).format("YYYY-MM-DD") : "";
	return data;
});

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("pages.administration.students.index.title"), to: "/administration/students" },
	{ title: title.value, disabled: true },
]);

const leave = () =>
	router.push(
		typeof route.query.returnUrl === "string" ? route.query.returnUrl : `/administration/students/${userId.value}/edit`
	);

const submit = async () => {
	if (!user.value || !(await form.value?.validate())?.valid) return;
	// Checkboxes the legacy form did not tick are not sent at all.
	const flag = (checked: boolean) => (checked ? true : undefined);
	saving.value = true;
	try {
		await api.skipRegistration(user.value._id, {
			password: password.value,
			// The date as midnight UTC, as the legacy form sends it.
			birthday: new Date(birthday.value).toISOString(),
			parent_privacyConsent: flag(parentConsent.privacyConsent),
			parent_termsOfUseConsent: flag(parentConsent.termsOfUseConsent),
			privacyConsent: flag(studentConsent.privacyConsent),
			termsOfUseConsent: flag(studentConsent.termsOfUseConsent),
		});
		done.value = {
			fullname: `${user.value.firstName} ${user.value.lastName}`,
			email: user.value.email,
			password: password.value,
		};
	} catch {
		notifyError(t("legacy.administration.controller.text.setupFailed"));
	} finally {
		saving.value = false;
	}
};

const print = () => window.print();

useTitle(computed(() => buildPageTitle(title.value)));
</script>

<style scoped>
.printonly {
	display: none;
}

@media print {
	.printonly {
		display: block;
	}

	.noprint {
		display: none;
	}
}
</style>
