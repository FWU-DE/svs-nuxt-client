<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="account-settings-title">{{ t("pages.accountSettings.title") }}</h1>
		</template>

		<VAlert v-if="isSsoAccount" class="mb-6" type="info" variant="tonal" data-testid="account-settings-sso">
			{{ t("pages.accountSettings.ssoHint") }}
		</VAlert>

		<VForm data-testid="account-settings-form" @submit.prevent="saveAccount">
			<VCard variant="outlined">
				<VCardItem>
					<template #prepend>
						<VIcon :icon="mdiAccountCircleOutline" />
					</template>
					<VCardTitle>{{ t("pages.accountSettings.profile") }}</VCardTitle>
				</VCardItem>

				<VCardText>
					<VRow>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.firstName"
								:label="t('common.labels.firstName')"
								:readonly="isSsoAccount"
								:data-testid="'account-first-name'"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.lastName"
								:label="t('common.labels.lastName')"
								:readonly="isSsoAccount"
								:data-testid="'account-last-name'"
							/>
						</VCol>
					</VRow>
				</VCardText>
			</VCard>

			<VCard v-if="!isSsoAccount" class="mt-6" variant="outlined">
				<VCardItem>
					<template #prepend>
						<VIcon :icon="mdiLockOutline" />
					</template>
					<VCardTitle>{{ t("pages.accountSettings.security") }}</VCardTitle>
					<VCardSubtitle>{{ t("pages.accountSettings.passwordHint") }}</VCardSubtitle>
				</VCardItem>

				<VCardText>
					<VTextField
						v-model="form.passwordOld"
						:label="t('pages.accountSettings.currentPassword')"
						:type="showPasswords ? 'text' : 'password'"
						:append-inner-icon="showPasswords ? mdiEyeOffOutline : mdiEyeOutline"
						:data-testid="'account-current-password'"
						@click:append-inner="showPasswords = !showPasswords"
					/>
					<VRow>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.passwordNew"
								:label="t('common.labels.password.new')"
								:type="showPasswords ? 'text' : 'password'"
								:data-testid="'account-new-password'"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="passwordConfirmation"
								:label="t('common.labels.password.confirmation')"
								:type="showPasswords ? 'text' : 'password'"
								:data-testid="'account-password-confirmation'"
							/>
						</VCol>
					</VRow>
				</VCardText>
			</VCard>

			<div class="mt-6">
				<VBtn
					color="primary"
					variant="flat"
					:prepend-icon="mdiContentSave"
					:disabled="isSsoAccount || !canSubmit"
					:loading="isSaving"
					type="submit"
					data-testid="account-settings-submit"
				>
					{{ t("common.actions.save") }}
				</VBtn>
			</div>
		</VForm>

		<VCard class="mt-6" variant="outlined" data-testid="onboarding-reset-card">
			<VCardItem>
				<template #prepend>
					<VIcon :icon="mdiLightbulbOnOutline" />
				</template>
				<VCardTitle>Onboarding-Assistent</VCardTitle>
				<VCardSubtitle>Fortschritt des Einrichtungsassistenten verwalten.</VCardSubtitle>
			</VCardItem>
			<VCardText>
				<p class="text-medium-emphasis mb-4">
					Setzt Ihre Angaben und den Fortschritt des Onboarding-Assistenten zurück. Der Assistent erscheint danach
					wieder im Menü und kann komplett neu durchlaufen werden.
				</p>
				<VBtn
					color="primary"
					variant="outlined"
					:prepend-icon="mdiRestore"
					data-testid="onboarding-reset-btn"
					@click="confirmResetOpen = true"
				>
					Onboarding zurücksetzen
				</VBtn>
			</VCardText>
		</VCard>

		<VDialog v-model="confirmResetOpen" max-width="460" data-testid="onboarding-reset-dialog">
			<VCard>
				<VCardItem>
					<VCardTitle>Onboarding zurücksetzen?</VCardTitle>
				</VCardItem>
				<VCardText>
					Ihre bisherigen Angaben und der erkundete Fortschritt gehen verloren. Möchten Sie fortfahren?
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" data-testid="onboarding-reset-cancel" @click="confirmResetOpen = false">
						{{ t("common.actions.cancel") }}
					</VBtn>
					<VBtn color="primary" variant="flat" data-testid="onboarding-reset-confirm" @click="resetOnboarding">
						Zurücksetzen
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useOnboardingWizard } from "@/composables/onboarding-wizard.composable";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { AccountApiFactory, PatchMyAccountParams } from "@api-server";
import { notifyError, notifySuccess, useAppStore, useAppStoreRefs } from "@data-app";
import {
	mdiAccountCircleOutline,
	mdiContentSave,
	mdiEyeOffOutline,
	mdiEyeOutline,
	mdiLightbulbOnOutline,
	mdiLockOutline,
	mdiRestore,
} from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { user, systemId } = useAppStoreRefs();
const appStore = useAppStore();
const accountApi = AccountApiFactory(undefined, "/v3", $axios);

useTitle(buildPageTitle(t("pages.accountSettings.title")));

const { reset: resetWizard } = useOnboardingWizard();
const confirmResetOpen = ref(false);

const resetOnboarding = () => {
	resetWizard();
	confirmResetOpen.value = false;
	notifySuccess("Onboarding-Assistent wurde zurückgesetzt.");
};

const form = reactive({
	firstName: "",
	lastName: "",
	passwordOld: "",
	passwordNew: "",
});
const passwordConfirmation = ref("");
const showPasswords = ref(false);
const isSaving = ref(false);

const isSsoAccount = computed(() => Boolean(systemId.value));
const hasPasswordChange = computed(() => form.passwordNew.length > 0 || passwordConfirmation.value.length > 0);
const hasProfileChange = computed(
	() => form.firstName !== (user.value?.firstName ?? "") || form.lastName !== (user.value?.lastName ?? "")
);
const passwordsMatch = computed(() => form.passwordNew === passwordConfirmation.value);
const canSubmit = computed(() => (hasProfileChange.value || hasPasswordChange.value) && passwordsMatch.value);

watch(
	user,
	(value) => {
		form.firstName = value?.firstName ?? "";
		form.lastName = value?.lastName ?? "";
	},
	{ immediate: true }
);

const saveAccount = async () => {
	if (isSsoAccount.value || !canSubmit.value) return;
	if (!passwordsMatch.value) {
		notifyError(t("pages.accountSettings.passwordMismatch"));
		return;
	}

	const payload: PatchMyAccountParams = {
		passwordOld: form.passwordOld,
		firstName: form.firstName,
		lastName: form.lastName,
		passwordNew: form.passwordNew || undefined,
	};

	isSaving.value = true;
	try {
		await accountApi.accountControllerUpdateMyAccount(payload);
		appStore.$patch({
			meResponse: appStore.meResponse
				? {
						...appStore.meResponse,
						user: {
							...appStore.meResponse.user,
							firstName: form.firstName,
							lastName: form.lastName,
						},
					}
				: undefined,
		});
		form.passwordOld = "";
		form.passwordNew = "";
		passwordConfirmation.value = "";
		notifySuccess(t("pages.accountSettings.saved"));
	} catch {
		notifyError(t("pages.accountSettings.saveError"));
	} finally {
		isSaving.value = false;
	}
};
</script>
