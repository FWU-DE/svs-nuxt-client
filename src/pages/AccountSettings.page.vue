<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="account-settings-title">{{ t("pages.accountSettings.title") }}</h1>
		</template>

		<VAlert v-if="isSsoAccount" class="mb-6" type="info" variant="tonal" data-testid="account-settings-sso">
			{{ t("pages.accountSettings.ssoHint") }}
		</VAlert>

		<VForm data-testid="account-settings-form" @submit.prevent="saveAccount">
			<label for="account-first-name" class="d-block font-weight-bold mb-2">
				{{ t("pages.accountSettings.label.firstName") }}
			</label>
			<VTextField
				id="account-first-name"
				v-model="form.firstName"
				variant="outlined"
				density="comfortable"
				hide-details
				class="mb-5"
				:readonly="isSsoAccount"
				data-testid="account-first-name"
			/>
			<label for="account-last-name" class="d-block font-weight-bold mb-2">
				{{ t("pages.accountSettings.label.lastName") }}
			</label>
			<VTextField
				id="account-last-name"
				v-model="form.lastName"
				variant="outlined"
				density="comfortable"
				hide-details
				class="mb-5"
				:readonly="isSsoAccount"
				data-testid="account-last-name"
			/>
			<label for="account-email" class="d-block font-weight-bold mb-2">
				{{ t("pages.accountSettings.label.email") }}
			</label>
			<VTextField
				id="account-email"
				v-model="form.email"
				type="email"
				variant="outlined"
				density="comfortable"
				hide-details
				class="mb-5"
				:disabled="isSsoAccount"
				data-testid="account-email"
			/>

			<template v-if="!isSsoAccount">
				<label for="account-current-password" class="d-block font-weight-bold mb-2">
					{{ t("pages.accountSettings.label.currentPassword") }}<sup>*</sup>
				</label>
				<VTextField
					id="account-current-password"
					v-model="form.passwordOld"
					variant="outlined"
					density="comfortable"
					hide-details
					class="mb-5"
					placeholder="***************"
					:type="showPasswords ? 'text' : 'password'"
					:append-inner-icon="showPasswords ? mdiEyeOutline : mdiEyeOffOutline"
					data-testid="account-current-password"
					@click:append-inner="showPasswords = !showPasswords"
				/>
				<label for="account-new-password" class="d-block font-weight-bold mb-2">
					{{ t("pages.accountSettings.label.newPassword") }}
				</label>
				<VTextField
					id="account-new-password"
					v-model="form.passwordNew"
					variant="outlined"
					density="comfortable"
					hide-details
					class="mb-5"
					placeholder="***************"
					:type="showPasswords ? 'text' : 'password'"
					data-testid="account-new-password"
				/>
				<label for="account-password-confirmation" class="d-block font-weight-bold mb-2">
					{{ t("pages.accountSettings.label.repeatNewPassword") }}
				</label>
				<VTextField
					id="account-password-confirmation"
					v-model="passwordConfirmation"
					variant="outlined"
					density="comfortable"
					hide-details
					class="mb-5"
					placeholder="***************"
					:type="showPasswords ? 'text' : 'password'"
					data-testid="account-password-confirmation"
				/>
			</template>

			<VBtn
				color="primary"
				variant="flat"
				size="large"
				:disabled="isSsoAccount"
				:loading="isSaving"
				type="submit"
				data-testid="account-settings-submit"
			>
				{{ t("pages.accountSettings.save") }}
			</VBtn>

			<p v-if="!isSsoAccount" class="text-caption text-medium-emphasis mt-4" data-testid="account-password-rules">
				<sup>*</sup> {{ t("pages.accountSettings.passwordRules") }}<br />
				{{ t("pages.accountSettings.allowedCharacters") }}
				<code>{{ t("pages.accountSettings.specialCharacters") }}</code>
			</p>
		</VForm>

		<h2 class="mt-8">
			<RouterLink class="third-party-link" to="/account/thirdPartyProviders" data-testid="account-third-party-link">
				{{ t("pages.accountSettings.thirdPartyLogins") }}
				<VIcon :icon="mdiChevronRight" />
			</RouterLink>
		</h2>

		<section class="mt-8" data-testid="onboarding-reset-card">
			<h2>Onboarding-Assistent</h2>
			<p class="text-medium-emphasis mb-4">
				Setzt Ihre Angaben und den Fortschritt des Onboarding-Assistenten zurück. Der Assistent erscheint danach wieder
				im Menü und kann komplett neu durchlaufen werden.
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
		</section>

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
import { mdiChevronRight, mdiEyeOffOutline, mdiEyeOutline, mdiRestore } from "@icons/material";
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
	email: "",
	passwordOld: "",
	passwordNew: "",
});
const passwordConfirmation = ref("");
const showPasswords = ref(false);
const isSaving = ref(false);

const isSsoAccount = computed(() => Boolean(systemId.value));
const hasPasswordChange = computed(() => form.passwordNew.length > 0 || passwordConfirmation.value.length > 0);
// The e-mail is not part of /me; the product's account page reads it from the
// user record of the old API, as this page does.
const currentEmail = ref("");
const hasEmailChange = computed(() => form.email.trim() !== currentEmail.value);
const hasProfileChange = computed(
	() => form.firstName !== (user.value?.firstName ?? "") || form.lastName !== (user.value?.lastName ?? "")
);
const passwordsMatch = computed(() => form.passwordNew === passwordConfirmation.value);
const canSubmit = computed(
	() => (hasProfileChange.value || hasPasswordChange.value || hasEmailChange.value) && passwordsMatch.value
);

watch(
	user,
	(value) => {
		form.firstName = value?.firstName ?? "";
		form.lastName = value?.lastName ?? "";
	},
	{ immediate: true }
);

const loadEmail = async (userId: string | undefined) => {
	if (!userId) return;
	try {
		const { data } = await $axios.get<{ email?: string }>(`/v1/users/${userId}`);
		currentEmail.value = data.email ?? "";
		form.email = currentEmail.value;
	} catch {
		// Without the address the field stays empty and is not sent.
	}
};

watch(
	() => user.value?.id,
	(id) => loadEmail(id),
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
		email: hasEmailChange.value ? form.email.trim() : undefined,
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
		currentEmail.value = form.email.trim();
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

<style lang="scss" scoped>
.third-party-link {
	color: inherit;
	text-decoration: none;
}
</style>
