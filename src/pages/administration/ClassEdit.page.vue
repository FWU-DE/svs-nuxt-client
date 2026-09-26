<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="class-edit-title">{{ title }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VForm ref="form" data-testid="class-edit-form" @submit.prevent="save">
				<RouterLink
					v-if="mode === 'edit'"
					class="d-block mb-4"
					:to="`/administration/classes/${classId}/manage`"
					data-testid="manage-class-btn"
				>
					<VIcon :icon="mdiAccountMultipleOutline" size="small" />
					{{ t("legacy.administration.classes.text.manageClass") }}
				</RouterLink>

				<VSelect
					v-model="year"
					:items="yearOptions"
					item-title="title"
					item-value="id"
					item-props="props"
					:label="`${t('legacy.administration.global.label.schoolYear')} *`"
					:placeholder="t('legacy.administration.global.label.chooseSchoolYear')"
					:disabled="isCustom && !keepYear"
					:rules="[yearRequired]"
					data-testid="class-school-year-selection"
				/>
				<VAutocomplete
					v-model="teacherIds"
					:items="teacherOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.administration.classes.label.selectTeacher')"
					:placeholder="t('legacy.global.placeholder.selectTeacher')"
					multiple
					chips
					closable-chips
					data-testid="class-teacher-selection"
				/>

				<VRow v-if="!isCustom">
					<VCol cols="12" sm="6">
						<VSelect
							v-model="grade"
							:items="gradeLevels"
							:label="`${t('legacy.administration.classes.label.grade')} *`"
							:placeholder="t('legacy.administration.global.placeholder.selectGrade')"
							:rules="[gradeRequired]"
							data-testid="class-grade"
						/>
					</VCol>
					<VCol cols="12" sm="6">
						<VTextField
							v-model="suffix"
							:label="t('legacy.administration.classes.label.className')"
							placeholder="a, b, c, ..., I, II, III, ..., etc."
							data-testid="class-suffix"
						/>
					</VCol>
				</VRow>
				<p v-if="mode !== 'upgrade'" class="mt-1">
					{{ t("legacy.administration.text.yourClassDoesntFitInto") }}
					<a href="#" data-testid="classCreationExtraOptions" @click.prevent="isCustom = !isCustom">
						{{ t("legacy.administration.text.moreOptions") }} </a
					>.
				</p>
				<section v-if="isCustom" data-testid="class-custom">
					<p><RenderHTML :html="t('legacy.administration.longText.text.canCreateYearIndependentClasses')" /></p>
					<VTextField
						v-model="customName"
						:label="t('legacy.administration.classes.label.className')"
						:placeholder="t('legacy.administration.classes.placeholder.exampleName')"
						:rules="[required]"
						data-testid="Klassenbezeichnung"
					/>
					<VCheckbox
						v-model="keepYear"
						:label="t('legacy.administration.classes.label.maintainSchoolYearAssignment')"
						hide-details
						data-testid="maintain-school-year-in-class"
					/>
				</section>

				<div class="recap mt-4 pa-3" data-testid="class-recap">
					<p class="mb-1">{{ t("legacy.administration.classes.text.className") }} {{ recapName }}</p>
					<p v-if="!isCustom || keepYear" class="mb-0">
						{{ t("legacy.administration.global.label.schoolYear") }}: {{ recapYear }}
					</p>
				</div>

				<div class="d-flex flex-wrap ga-2 mt-6 justify-end">
					<VBtn
						v-if="mode === 'edit' && isUpgradable"
						variant="outlined"
						color="primary"
						class="mr-auto"
						:to="`/administration/classes/${classId}/createSuccessor`"
						data-testid="class-upgrade"
					>
						{{ t("legacy.administration.classes.button.transferClassToTheNextSchoolYear") }}
					</VBtn>
					<VBtn variant="text" data-testid="class-edit-cancel" @click="leave()">{{
						t("legacy.global.button.cancel")
					}}</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="confirmClassCreate">
						{{ submitLabel }}
					</VBtn>
				</div>
				<p v-if="mode === 'create' && isAdmin" class="text-medium-emphasis mt-2">
					{{ t("legacy.administration.classes.text.theNextStepIsToInviteOrAdd") }}
				</p>
			</VForm>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// Create, rename or move a class to the next school year (legacy views/administration/classes-edit.hbs).
import { serverMessage } from "@/components/homework/serverMessage";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LegacyClass, personName, useLegacySchoolPeopleApi } from "@/composables/legacy-school-people.api";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission } from "@api-server";
import { notifyError, useAppStore, useSchoolStore } from "@data-app";
import { RenderHTML } from "@feature-render-html";
import { mdiAccountMultipleOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute, useRouter } from "vue-router";

type Successor = LegacyClass & { predecessor: string; duplicates: string[] };

const props = defineProps<{ mode: "create" | "edit" | "upgrade" }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const people = useLegacySchoolPeopleApi();

const classId = computed(() => (route.params.id ? String(route.params.id) : undefined));
const isAdmin = computed(() => appStore.userPermissions.includes(Permission.ADMIN_VIEW));

const year = ref<string | null>(null);
const teacherIds = ref<string[]>([]);
const grade = ref<number | null>(null);
const suffix = ref("");
const isCustom = ref(false);
const customName = ref("");
const keepYear = ref(true);
const current = ref<LegacyClass>();
const successor = ref<Successor>();
const teacherOptions = ref<{ id: string; title: string }[]>([]);
const saving = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

const gradeLevels = Array.from({ length: 13 }, (_, i) => i + 1);
const schoolYears = computed(() => useSchoolStore().schoolDetails?.years);

// Only the last, the current and the next school year can be chosen, as in the legacy form.
const yearOptions = computed(() => {
	const years = schoolYears.value;
	const selectable = new Set([years?.activeYear?.id, years?.nextYear?.id, years?.lastYear?.id].filter(Boolean));
	return [...(years?.schoolYears ?? [])]
		.sort((a, b) => b.startDate.localeCompare(a.startDate))
		.map((y) => ({
			id: y.id,
			title: y.name,
			props: { disabled: !selectable.has(y.id) || (props.mode === "upgrade" && y.id !== year.value) },
		}));
});

const title = computed(() => {
	const name = current.value?.displayName ?? successor.value?.displayName ?? "";
	if (props.mode === "edit") return t("legacy.administration.controller.headline.editClass", { name });
	if (props.mode === "upgrade") return t("legacy.administration.controller.headline.upgradeClass", { name });
	return t("legacy.administration.controller.link.createANewClass");
});
const submitLabel = computed(() => {
	if (props.mode === "edit") return t("legacy.global.button.saveChanges");
	if (props.mode === "upgrade") return t("pages.classEdit.moveToYear", { year: recapYear.value });
	return t("legacy.administration.classes.button.addClass");
});

const isUpgradable = computed(() => {
	const c = current.value;
	if (!c?.year || !c.gradeLevel) return false;
	const selectable = new Set([schoolYears.value?.activeYear?.id, schoolYears.value?.lastYear?.id].filter(Boolean));
	return schoolYears.value?.nextYear?.id !== c.year && selectable.has(c.year) && c.gradeLevel !== 13 && !c.successor;
});

const recapName = computed(() => (isCustom.value ? customName.value : `${grade.value ?? ""}${suffix.value}`));
const recapYear = computed(() => schoolYears.value?.schoolYears.find((y) => y.id === year.value)?.name ?? "");

const required = (value: string) => !!value?.trim() || t("pages.legacyPages.required");
const gradeRequired = (value: number | null) => !!value || t("pages.legacyPages.required");
const yearRequired = (value: string | null) =>
	(isCustom.value && !keepYear.value) || !!value || t("pages.legacyPages.required");

const fillFrom = (c: LegacyClass) => {
	teacherIds.value = [...(c.teacherIds ?? [])];
	year.value = c.year ?? null;
	if (c.gradeLevel) {
		grade.value = c.gradeLevel;
		suffix.value = c.name ?? "";
	} else {
		isCustom.value = true;
		customName.value = c.name ?? "";
		keepYear.value = !!c.year;
	}
};

const { loadingState } = useSafeAxiosRunner(async () => {
	const teachers = await people.listUsers("teachers");
	teacherOptions.value = teachers.map((p) => ({ id: p._id, title: personName(p) }));
	if (props.mode === "edit" && classId.value) {
		const { data } = await $axios.get<LegacyClass>(`/v1/classes/${classId.value}`);
		current.value = data;
		fillFrom(data);
	} else if (props.mode === "upgrade" && classId.value) {
		const { data } = await $axios.get<Successor>(`/v1/classes/successor/${classId.value}`);
		successor.value = data;
		fillFrom(data);
	} else {
		year.value = schoolYears.value?.activeYear?.id ?? null;
		// A teacher creating a class teaches it.
		if (!isAdmin.value && appStore.user?.id) teacherIds.value = [appStore.user.id];
	}
	return true;
});

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("global.sidebar.item.classes"), to: "/administration/groups/classes" },
	{ title: title.value, disabled: true },
]);

const leave = (id?: string) => {
	if (id) return router.push(isAdmin.value ? "/administration/groups/classes" : `/administration/classes/${id}/manage`);
	return router.push("/administration/groups/classes");
};

const body = () => {
	const data: Record<string, unknown> = { teacherIds: teacherIds.value };
	if (isCustom.value) {
		data.name = customName.value.trim();
		if (keepYear.value) data.year = year.value;
	} else {
		data.name = suffix.value.trim();
		data.gradeLevel = grade.value;
		data.year = year.value;
	}
	return data;
};

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	saving.value = true;
	try {
		if (props.mode === "edit" && classId.value) {
			await $axios.patch(`/v1/classes/${classId.value}`, body());
			await leave();
			return;
		}
		const data = body();
		if (props.mode === "upgrade" && successor.value) {
			data.predecessor = successor.value.predecessor;
			data.userIds = successor.value.userIds;
		}
		const { data: created } = await $axios.post<LegacyClass>("/v1/classes", data);
		await leave(created._id);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

useTitle(computed(() => buildPageTitle(title.value)));
</script>

<style lang="scss" scoped>
.recap {
	background: rgba(0, 0, 0, 0.04);
	border-radius: 4px;
}
</style>
