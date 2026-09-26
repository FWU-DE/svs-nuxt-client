<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="user-edit-title">{{ title }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VForm v-if="user" ref="form" data-testid="user-form" @submit.prevent="save">
				<VRow>
					<VCol cols="12" md="6">
						<VTextField
							v-model="firstName"
							:label="`${t('legacy.global.label.firstNameColon')} *`"
							:aria-label="t('legacy.administration.users_edit.aria_label.firstName')"
							:rules="[required]"
							:readonly="usesLdap"
							data-testid="user-first-name"
						/>
					</VCol>
					<VCol cols="12" md="6">
						<VTextField
							v-model="lastName"
							:label="`${t('legacy.global.label.lastNameColon')} *`"
							:aria-label="t('legacy.administration.users_edit.aria_label.lastName')"
							:rules="[required]"
							:readonly="usesLdap"
							data-testid="user-last-name"
						/>
					</VCol>
				</VRow>
				<VTextField
					v-model="email"
					type="email"
					:label="`${t('legacy.global.label.emailAddress')} *`"
					:aria-label="t('legacy.administration.users_edit.aria_label.email')"
					placeholder="user@schul-cloud.org"
					:rules="[required]"
					:readonly="usesLdap"
					data-testid="user-email"
				/>
				<VTextField
					v-if="isStudent"
					v-model="birthday"
					type="date"
					:label="`${t('legacy.global.label.dateOfBirth')} *`"
					:aria-label="t('legacy.administration.users_edit.aria_label.birthdate')"
					:min="minBirthday"
					:max="maxBirthday"
					:rules="[required]"
					data-testid="user-birthday"
				/>
				<VAutocomplete
					v-else
					v-model="classIds"
					:items="classOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.administration.global.label.classes')"
					:placeholder="t('legacy.administration.users_edit.text.class')"
					multiple
					chips
					closable-chips
					data-testid="user-classes"
				/>

				<template v-if="consentNecessary">
					<div class="d-flex align-center justify-space-between mt-4">
						<h2 class="text-h5 ma-0">
							{{ t("legacy.administration.button.consent") }}
							<VIcon :icon="consentIcon.icon" :color="consentIcon.color" size="small" />
						</h2>
						<VBtn
							v-if="!hasImportHash"
							size="small"
							variant="outlined"
							:prepend-icon="mdiPencilOutline"
							data-testid="edit-consent"
							@click="editConsent = true"
						>
							{{ t("legacy.global.button.edit") }}
						</VBtn>
					</div>
					<div v-if="hasImportHash" data-testid="consent-on-paper">
						<p>{{ t("legacy.administration.longText.text.thereIsNoDeclarationOfConsent") }}</p>
						<VBtn
							variant="outlined"
							:prepend-icon="mdiCheckboxMarkedOutline"
							:to="`/administration/students/${userId}/skipregistration`"
							data-testid="button-skip-registration"
						>
							{{ t("legacy.administration.button.receivedConsentOnPaper") }}
						</VBtn>
					</div>
					<VRow v-else data-testid="consents-overview">
						<VCol v-for="part in consentParts" :key="part.key" cols="12" md="6">
							<p class="font-weight-bold mb-1">{{ part.label }}</p>
							<VRadioGroup v-model="part.model.form" inline :disabled="!editConsent" hide-details>
								<VRadio :label="t('legacy.administration.label.analog')" value="analog" />
								<VRadio :label="t('legacy.administration.label.digital')" value="digital" />
							</VRadioGroup>
							<VCheckbox
								v-model="part.model.privacyConsent"
								:label="t('legacy.administration.global.label.dataProtection')"
								:disabled="!editConsent"
								hide-details
								density="compact"
							/>
							<VCheckbox
								v-model="part.model.termsOfUseConsent"
								:label="
									isStudent
										? t('legacy.administration.label.termsOfUse')
										: t('legacy.administration.global.label.termsOfUse')
								"
								:disabled="!editConsent"
								hide-details
								density="compact"
							/>
						</VCol>
					</VRow>
				</template>
				<template v-else>
					<h2 class="text-h5 mt-4">{{ t("legacy.administration.button.onlyRegistrationNeeded") }}</h2>
					<p v-if="!account" class="text-medium-emphasis">
						{{
							isStudent
								? t("legacy.administration.longText.text.registrationNotCompleted")
								: t("legacy.administration.longText.text.teacherRegistrationNotCompleted")
						}}
					</p>
				</template>

				<div class="d-flex flex-wrap ga-2 mt-6">
					<template v-if="!usesLdap">
						<VBtn
							variant="outlined"
							:disabled="!account"
							:title="account ? undefined : t('legacy.administration.users_edit.text.firstFinishRegistration')"
							data-testid="button-change-password"
							@click="passwordDialog = true"
						>
							{{ t("legacy.administration.users_edit.headline.changePassword") }}
						</VBtn>
						<VBtn v-if="canDelete" variant="outlined" data-testid="button_delete_user" @click="deleteDialog = true">
							{{ t("legacy.administration.users_edit.headline.deleteUser") }}
						</VBtn>
						<VBtn
							variant="outlined"
							:disabled="!!account"
							:title="account ? t('legacy.administration.users_edit.text.alreadyRegistered') : undefined"
							data-testid="generate-registration-link"
							@click="generateLink"
						>
							{{ t("legacy.administration.button.generatePersonalInvitationLink") }}
						</VBtn>
						<VBtn
							variant="outlined"
							:disabled="!!account"
							:loading="sendingMail"
							:title="account ? t('legacy.administration.users_edit.text.alreadyRegistered') : undefined"
							data-testid="send-registration-mail"
							@click="sendMail"
						>
							{{ t("legacy.administration.button.sendTheInvitationLinkByMail") }}
						</VBtn>
					</template>
					<VSpacer />
					<VBtn variant="text" data-testid="user-edit-cancel" @click="leave">{{
						t("legacy.global.button.cancel")
					}}</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="button_save_user">
						{{ t("legacy.global.button.save") }}
					</VBtn>
				</div>
				<VAlert v-if="registrationLink" type="info" variant="tonal" class="mt-4" data-testid="registration-link">
					<a :href="registrationLink" target="_blank">{{ registrationLink }}</a>
				</VAlert>
			</VForm>
		</SvsLoading>

		<VDialog v-model="passwordDialog" max-width="480" data-testid="pw-modal">
			<VCard>
				<VCardTitle>{{ t("legacy.administration.users_edit.headline.changePassword") }}</VCardTitle>
				<VCardText>
					<VTextField
						v-model="newPassword"
						type="password"
						autocomplete="new-password"
						:label="t('legacy.administration.global.label.assignPassword')"
						data-testid="user-new-password"
					/>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="passwordDialog = false">{{ t("legacy.global.button.cancel") }}</VBtn>
					<VBtn
						color="primary"
						variant="flat"
						:disabled="!newPassword"
						data-testid="user-password-save"
						@click="changePassword"
					>
						{{ t("legacy.global.button.save") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<VDialog v-model="deleteDialog" max-width="480" data-testid="delete-modal">
			<VCard>
				<VCardTitle>{{ t("legacy.administration.users_edit.headline.deleteUser") }}</VCardTitle>
				<VCardText>{{ t("legacy.global.text.areYouSure") }} {{ firstName }} {{ lastName }}</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="deleteDialog = false">{{ t("legacy.global.button.cancel") }}</VBtn>
					<VBtn color="primary" variant="flat" data-testid="user-delete-confirm" @click="deleteUser">
						{{ t("legacy.global.headline.delete") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// Edit a student or teacher in the administration (legacy views/administration/users_edit.hbs):
// names, e-mail, birthday or classes, consents, password, deletion and registration links.
import { serverMessage } from "@/components/homework/serverMessage";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { useLegacySchoolPeopleApi } from "@/composables/legacy-school-people.api";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission } from "@api-server";
import { notifyError, notifySuccess, useAppStore, useSchoolStore } from "@data-app";
import { useEnvConfig } from "@data-env";
import { mdiCheck, mdiCheckAll, mdiCheckboxMarkedOutline, mdiClose, mdiPencilOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import dayjs from "dayjs";
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

type Consent = { form?: string; privacyConsent?: boolean; termsOfUseConsent?: boolean };
type AdminUser = {
	_id: string;
	firstName: string;
	lastName: string;
	email: string;
	birthday?: string;
	importHash?: string;
	consentStatus?: string;
	consent?: { userConsent?: Consent; parentConsents?: Consent[] };
};

const props = defineProps<{ kind: "students" | "teachers" }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const people = useLegacySchoolPeopleApi();

const userId = computed(() => String(route.params.id));
const isStudent = computed(() => props.kind === "students");
const title = computed(() =>
	isStudent.value
		? t("legacy.administration.controller.link.editingStudents")
		: t("legacy.administration.controller.link.editTeacher")
);
const consentNecessary = computed(() => useEnvConfig().value.FEATURE_CONSENT_NECESSARY);
// Names and e-mail come from the source system of an externally managed school (LDAP in the product).
const usesLdap = computed(() => !!useSchoolStore().schoolDetails?.isExternal);
const canDelete = computed(() =>
	appStore.userPermissions.includes(isStudent.value ? Permission.STUDENT_DELETE : Permission.TEACHER_DELETE)
);

const user = ref<AdminUser>();
const account = ref<{ id: string }>();
const firstName = ref("");
const lastName = ref("");
const email = ref("");
const birthday = ref("");
const classIds = ref<string[]>([]);
const originalClassIds = ref<string[]>([]);
const classOptions = ref<{ id: string; title: string }[]>([]);
const userConsent = reactive<Consent>({});
const parentConsent = reactive<Consent>({});
const editConsent = ref(false);
const saving = ref(false);
const sendingMail = ref(false);
const passwordDialog = ref(false);
const deleteDialog = ref(false);
const newPassword = ref("");
const registrationLink = ref<string>();
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

const minBirthday = dayjs().subtract(100, "year").format("YYYY-MM-DD");
const maxBirthday = dayjs().subtract(4, "year").format("YYYY-MM-DD");
const required = (value: string) => !!value?.trim() || t("pages.legacyPages.required");

// An imported student who has not registered yet: the consent can be given on paper instead.
const hasImportHash = computed(() => isStudent.value && !!user.value?.importHash);

const consentParts = computed(() =>
	isStudent.value
		? [
				{ key: "parent", label: t("legacy.administration.global.label.parents"), model: parentConsent },
				{ key: "student", label: t("legacy.administration.global.label.student"), model: userConsent },
			]
		: [{ key: "teacher", label: t("legacy.administration.global.label.teacher"), model: userConsent }]
);

const consentIcon = computed(() => {
	switch (user.value?.consentStatus) {
		case "ok":
			return { icon: mdiCheckAll, color: "success" };
		case "parentsAgreed":
			return { icon: mdiCheck, color: "warning" };
		default:
			return { icon: mdiClose, color: "error" };
	}
});

const { loadingState } = useSafeAxiosRunner(async () => {
	const [loaded, accounts] = await Promise.all([
		$axios.get<AdminUser>(`/v3/users/admin/${props.kind}/${userId.value}`),
		$axios.get<{ data: { id: string }[] }>("/v3/account", { params: { type: "userId", value: userId.value } }),
	]);
	user.value = loaded.data;
	account.value = accounts.data.data[0];
	firstName.value = loaded.data.firstName;
	lastName.value = loaded.data.lastName;
	email.value = loaded.data.email;
	birthday.value = loaded.data.birthday ? dayjs(loaded.data.birthday).format("YYYY-MM-DD") : "";
	Object.assign(userConsent, loaded.data.consent?.userConsent ?? {});
	Object.assign(parentConsent, loaded.data.consent?.parentConsents?.[0] ?? {});
	if (!isStudent.value) {
		const years = new Map((useSchoolStore().schoolDetails?.years?.schoolYears ?? []).map((y) => [y.id, y.name]));
		const classes = await people.listClasses();
		classOptions.value = classes.map((c) => ({
			id: c._id,
			title: `${c.displayName ?? c.name ?? ""}${c.year && years.get(c.year) ? ` (${years.get(c.year)})` : ""}`,
		}));
		originalClassIds.value = classes.filter((c) => c.teacherIds.includes(userId.value)).map((c) => c._id);
		classIds.value = [...originalClassIds.value];
	}
	return loaded.data;
});

const returnUrl = computed(() =>
	typeof route.query.returnUrl === "string" ? route.query.returnUrl : `/administration/${props.kind}`
);
const leave = () => router.push(returnUrl.value);

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{
		title: isStudent.value
			? t("pages.administration.students.index.title")
			: t("pages.administration.teachers.index.title"),
		to: `/administration/${props.kind}`,
	},
	{ title: title.value, disabled: true },
]);

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	const body: Record<string, unknown> = { firstName: firstName.value, lastName: lastName.value, email: email.value };
	// The date as midnight UTC, as the legacy form sends it.
	if (isStudent.value) body.birthday = new Date(birthday.value).toISOString();
	if (editConsent.value) {
		body.consent = isStudent.value
			? { userConsent: { ...userConsent }, parentConsents: [{ ...parentConsent }] }
			: { userConsent: { ...userConsent } };
	}
	saving.value = true;
	try {
		await $axios.patch(`/v1/users/admin/${props.kind}/${userId.value}`, body);
		if (!isStudent.value) {
			const added = classIds.value.filter((id) => !originalClassIds.value.includes(id));
			const removed = originalClassIds.value.filter((id) => !classIds.value.includes(id));
			await Promise.all([
				...added.map((id) => $axios.patch(`/v1/classes/${id}`, { $push: { teacherIds: userId.value } })),
				...removed.map((id) => $axios.patch(`/v1/classes/${id}`, { $pull: { teacherIds: userId.value } })),
			]);
		}
		notifySuccess(t("pages.userEdit.saved"));
		await leave();
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

const changePassword = async () => {
	if (!account.value) return;
	try {
		await $axios.patch(`/v3/account/${account.value.id}`, { password: newPassword.value });
		passwordDialog.value = false;
		newPassword.value = "";
		notifySuccess(t("pages.userEdit.passwordSaved"));
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.userEdit.passwordError"));
	}
};

const deleteUser = async () => {
	try {
		await $axios.delete("/v3/deletionRequestsPublic", { params: { ids: [userId.value] } });
		deleteDialog.value = false;
		await router.push(`/administration/${props.kind}`);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	}
};

const generateLink = async () => {
	try {
		const { data } = await $axios.post<{ qrContent?: string }[]>("/v1/users/qrRegistrationLink", {
			userIds: [userId.value],
			selectionType: "inclusive",
			roleName: isStudent.value ? "student" : "teacher",
		});
		registrationLink.value = data[0]?.qrContent;
		if (!registrationLink.value) notifyError(t("legacy.administration.users_edit.text.alreadyRegistered"));
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	}
};

const sendMail = async () => {
	sendingMail.value = true;
	try {
		await $axios.post("/v1/users/mail/registrationLink", { userIds: [userId.value], selectionType: "inclusive" });
		notifySuccess(t("legacy.administration.users_edit.text.successfullySentMail"));
	} catch {
		notifyError(t("legacy.administration.users_edit.text.errorSendingMail"));
	} finally {
		sendingMail.value = false;
	}
};

useTitle(computed(() => buildPageTitle(title.value)));
</script>
