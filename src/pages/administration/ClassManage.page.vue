<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="class-manage-title">
				{{ t("legacy.administration.controller.headline.manageClass", { name: klass?.displayName ?? "" }) }}
			</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VForm v-if="klass" ref="form" data-testid="class-manage-form" @submit.prevent="save">
				<RouterLink class="d-block mb-4" :to="`/administration/classes/${classId}/edit`" data-testid="rename-class-btn">
					<VIcon :icon="mdiPencilOutline" size="small" /> {{ t("legacy.administration.classes.label.renameClass") }}
				</RouterLink>
				<VAutocomplete
					v-model="teacherIds"
					:items="teacherOptions"
					item-title="title"
					item-value="id"
					:label="`${t('legacy.global.placeholder.Lehrer')}${isAdmin ? '' : ' *'}`"
					:placeholder="t('legacy.global.placeholder.selectTeacher')"
					:rules="isAdmin ? [] : [atLeastOne]"
					multiple
					chips
					closable-chips
					data-testid="teacher-selection-on-manage-class"
				/>
				<VAutocomplete
					v-model="userIds"
					:items="studentOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.administration.global.label.student')"
					:placeholder="t('legacy.administration.global.placeholder.selectStudent')"
					multiple
					chips
					closable-chips
					data-testid="student-selection-on-manage-class"
				/>
				<div class="d-flex justify-end ga-2 mt-2">
					<VBtn variant="text" @click="leave">{{ t("legacy.global.button.cancel") }}</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="manage-confirm">
						{{ t("legacy.global.button.saveChanges") }}
					</VBtn>
				</div>

				<VDivider class="my-6" />
				<h2 class="text-h4">
					{{ t("legacy.administration.classes.headline.questionStudentsNotInSystem", { shortTitle: themeTitle }) }}
				</h2>
				<template v-if="consentNecessary">
					<p>{{ t("legacy.administration.classes.text.inviteTheParentsViaLink") }}</p>
					<h2 class="text-h4">{{ t("legacy.administration.global.text.obtainADeclarationConsent") }}</h2>
					<p class="font-weight-bold mb-1">
						{{ t("legacy.administration.global.text.inviteparentsAndStudentViaLink") }}
					</p>
					<p>{{ t("legacy.administration.students.text.forAllStudentsWithoutAFullConsentForm") }}</p>
					<VBtn
						variant="outlined"
						class="mb-4"
						:loading="sending"
						data-testid="btn-send-links-emails"
						@click="sendLinks"
					>
						{{ t("legacy.administration.global.button.sendLinksToStudentEmailAddresses") }}
					</VBtn>
					<p><RenderHTML :html="t('legacy.administration.global.text.orSelectStudentFromTable')" /></p>
				</template>
				<template v-else>
					<p><RenderHTML :html="t('legacy.administration.classes.text.inviteViaLink')" /></p>
				</template>

				<h2 class="text-h4 mt-4">{{ t("legacy.administration.classes.label.pleaseNote") }}</h2>
				<LegacyAccordion :items="notes" test-id="class-notes">
					<template #default="{ item }">
						<RenderHTML :html="item.content" />
					</template>
				</LegacyAccordion>
			</VForm>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// Teachers and students of a class, and how to get the students into the cloud
// (legacy views/administration/classes-manage.hbs).
import { serverMessage } from "@/components/homework/serverMessage";
import LegacyAccordion from "@/components/legacy/LegacyAccordion.vue";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import {
	LegacyClass,
	personName,
	SchoolPerson,
	useLegacySchoolPeopleApi,
} from "@/composables/legacy-school-people.api";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission } from "@api-server";
import { notifyError, notifySuccess, useAppStore } from "@data-app";
import { useEnvConfig } from "@data-env";
import { RenderHTML } from "@feature-render-html";
import { mdiPencilOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute, useRouter } from "vue-router";

const CONSENT_WITHOUT_PARENTS_MIN_AGE_YEARS = 16;

type PopulatedClass = Omit<LegacyClass, "teacherIds" | "userIds"> & {
	teacherIds: SchoolPerson[];
	userIds: SchoolPerson[];
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const people = useLegacySchoolPeopleApi();

const classId = computed(() => String(route.params.id));
const isAdmin = computed(() => appStore.userPermissions.includes(Permission.ADMIN_VIEW));
const canListStudents = computed(() => appStore.userPermissions.includes(Permission.STUDENT_LIST));
const consentNecessary = computed(() => useEnvConfig().value.FEATURE_CONSENT_NECESSARY);
const themeTitle = computed(() => useEnvConfig().value.SC_TITLE ?? "");

const klass = ref<LegacyClass>();
const teacherIds = ref<string[]>([]);
const userIds = ref<string[]>([]);
const teacherOptions = ref<{ id: string; title: string }[]>([]);
const studentOptions = ref<{ id: string; title: string }[]>([]);
const saving = ref(false);
const sending = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

const atLeastOne = (value: string[]) => value.length > 0 || t("pages.legacyPages.required");

const notes = computed(() => {
	const changePassword = {
		key: "password",
		title: t("legacy.administration.controller.link.changePassword"),
		content: t("legacy.administration.controller.text.whenLoggingInForTheFirstTime"),
	};
	if (!consentNecessary.value) return [changePassword];
	return [
		{
			key: "analog",
			title: t("legacy.administration.controller.link.analogueConsent"),
			content:
				t("legacy.administration.controller.text.analogueConsent") +
				t("legacy.administration.controller.text.analogueConsentBullets"),
		},
		{
			key: "under",
			title: t("legacy.administration.controller.text.yourStudentsAreUnder", {
				age: CONSENT_WITHOUT_PARENTS_MIN_AGE_YEARS,
			}),
			content: t("legacy.administration.controller.text.registrationExplanation", { title: themeTitle.value }),
		},
		{
			key: "over",
			title: t("legacy.administration.controller.text.yourStudentsAreAtLeast", {
				age: CONSENT_WITHOUT_PARENTS_MIN_AGE_YEARS,
			}),
			content:
				t("legacy.administration.controller.text.passTheRegistrationLinkDirectly") +
				t("legacy.administration.controller.text.theStepsForTheParentsAreOmitted"),
		},
		changePassword,
	];
});

const { loadingState } = useSafeAxiosRunner(async () => {
	const [{ data }, teachers, students] = await Promise.all([
		$axios.get<PopulatedClass>(`/v1/classes/${classId.value}`, { params: { $populate: ["teacherIds", "userIds"] } }),
		people.listUsers("teachers"),
		canListStudents.value ? people.listUsers("students") : Promise.resolve<SchoolPerson[]>([]),
	]);
	klass.value = { ...data, teacherIds: data.teacherIds.map((u) => u._id), userIds: data.userIds.map((u) => u._id) };
	teacherIds.value = klass.value.teacherIds;
	userIds.value = klass.value.userIds;
	teacherOptions.value = teachers.map((p) => ({ id: p._id, title: personName(p) }));
	// Without STUDENT_LIST only the students already in the class are offered.
	const offered = canListStudents.value ? students : data.userIds;
	studentOptions.value = offered.map((p) => ({ id: p._id, title: `${p.firstName} ${p.lastName}` }));
	return data;
});

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("global.sidebar.item.classes"), to: "/administration/groups/classes" },
	{ title: klass.value?.displayName ?? "", disabled: true },
]);

const leave = () => router.push("/administration/groups/classes");

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	saving.value = true;
	try {
		await $axios.patch(`/v1/classes/${classId.value}`, { teacherIds: teacherIds.value, userIds: userIds.value });
		await leave();
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

const sendLinks = async () => {
	sending.value = true;
	try {
		await $axios.post("/v1/users/mail/registrationLink", { userIds: userIds.value, selectionType: "inclusive" });
		notifySuccess(t("legacy.administration.users_edit.text.successfullySentMail"));
	} catch {
		notifyError(t("legacy.administration.users_edit.text.errorSendingMail"));
	} finally {
		sending.value = false;
	}
};

useTitle(
	computed(() =>
		buildPageTitle(t("legacy.administration.controller.headline.manageClass", { name: klass.value?.displayName ?? "" }))
	)
);
</script>
