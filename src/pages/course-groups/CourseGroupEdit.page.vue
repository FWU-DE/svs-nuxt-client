<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="course-group-edit-title">
				{{
					isNew
						? t("legacy.courses._course.groups.headline.addGroup")
						: t("legacy.courses._course.groups.headline.editGroup")
				}}
			</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VForm ref="form" data-testid="course-group-form" @submit.prevent="save">
				<VTextField
					v-model="name"
					:label="t('legacy.courses._course.groups._group.edit.label.nameOfGroup')"
					:placeholder="t('legacy.courses._course.groups._group.edit.input.group1')"
					:rules="[required]"
					data-testid="group-name-field"
					class="mb-2"
				/>
				<VAutocomplete
					v-model="memberIds"
					:items="studentOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.administration.global.label.studentParticipants')"
					:placeholder="t('legacy.courses.global.input.selectStudents')"
					multiple
					chips
					closable-chips
					data-testid="group-member-field"
				/>
				<div class="d-flex justify-end ga-2 mt-6">
					<VBtn variant="text" data-testid="course-group-cancel" @click="leave()">
						{{ t("legacy.global.button.cancel") }}
					</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="create-course-group">
						{{ isNew ? t("legacy.courses._course.groups.button.addGroup") : t("legacy.global.button.saveChanges") }}
					</VBtn>
				</div>
			</VForm>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// Create or edit a student group (legacy views/courses/edit-courseGroup.hbs). Students who may
// not edit the course are always part of the groups they create or change.
import { serverMessage } from "@/components/homework/serverMessage";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LegacyPerson, useLegacyCourseApi } from "@/composables/legacy-course.api";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission } from "@api-server";
import { notifyError, useAppStore } from "@data-app";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useLegacyCourseApi();
const appStore = useAppStore();

const courseId = computed(() => String(route.params.courseId));
const groupId = computed(() => (route.params.groupId ? String(route.params.groupId) : undefined));
const isNew = computed(() => !groupId.value);
const canEditCourse = computed(() => appStore.userPermissions.includes(Permission.COURSE_EDIT));

const name = ref("");
const memberIds = ref<string[]>([]);
const students = ref<LegacyPerson[]>([]);
const courseName = ref("");
const saving = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

const required = (value: string) => !!value?.trim() || t("pages.legacyPages.required");

const studentOptions = computed(() =>
	students.value.map((s) => ({ id: s._id, title: `${s.firstName} ${s.lastName}` }))
);

const { loadingState } = useSafeAxiosRunner(async () => {
	const course = await api.getCourseWithPeople(courseId.value, ["userIds"]);
	students.value = (course.userIds as LegacyPerson[] | undefined) ?? [];
	courseName.value = String(course.name ?? "");
	if (groupId.value) {
		const group = await api.getGroup(groupId.value);
		name.value = group.name;
		memberIds.value = group.userIds.map((u) => u._id);
	} else if (!canEditCourse.value && appStore.user?.id) {
		memberIds.value = [appStore.user.id];
	}
	return course;
});

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("common.words.courses"), to: "/rooms/courses-overview" },
	{ title: courseName.value, to: `/rooms/${courseId.value}` },
	{ title: t("pages.courseRooms.tabLabel.groups"), to: `/rooms/${courseId.value}?tab=groups` },
]);

const leave = (id?: string) => {
	if (id) return router.push(`/courses/${courseId.value}/groups/${id}`);
	return router.push({ path: `/rooms/${courseId.value}`, query: { tab: "groups" } });
};

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	const me = appStore.user?.id;
	const userIds = [...memberIds.value];
	if (!canEditCourse.value && me && !userIds.includes(me)) userIds.push(me);
	saving.value = true;
	try {
		const saved = groupId.value
			? await api.updateGroup(groupId.value, { name: name.value.trim(), userIds })
			: await api.createGroup({ name: name.value.trim(), courseId: courseId.value, userIds });
		await leave(saved._id);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

useTitle(
	computed(() =>
		buildPageTitle(
			isNew.value
				? t("legacy.courses._course.groups.headline.addGroup")
				: t("legacy.courses._course.groups.headline.editGroup")
		)
	)
);
</script>
