<template>
	<DefaultWireframe max-width="short" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="task-edit-title">
				{{ isNew ? t("pages.taskEdit.createTitle") : t("pages.taskEdit.editTitle") }}
			</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VForm ref="form" data-testid="task-edit-form" @submit.prevent="save">
				<VTextField
					v-model="name"
					:label="t('pages.taskEdit.name')"
					:rules="[required]"
					data-testid="task-edit-name"
					class="mb-2"
				/>
				<VSelect
					v-model="courseId"
					:items="courseOptions"
					item-title="title"
					item-value="id"
					:label="t('pages.taskEdit.course')"
					:disabled="isSubstitutionOnly"
					:hint="isSubstitutionOnly ? t('pages.taskEdit.substitutionCannotChangeCourse') : undefined"
					persistent-hint
					data-testid="task-edit-course"
					class="mb-2"
				/>
				<VSelect
					v-model="lessonId"
					:items="lessonOptions"
					item-title="title"
					item-value="id"
					:label="t('pages.taskEdit.topic')"
					:disabled="!courseId"
					data-testid="task-edit-lesson"
					class="mb-2"
				/>
				<VTextField
					v-model="availableDate"
					type="datetime-local"
					:label="t('pages.taskEdit.availableDate')"
					:rules="[required]"
					data-testid="task-edit-available-date"
					class="mb-2"
				/>
				<VTextField
					v-model="dueDate"
					type="datetime-local"
					:label="t('pages.taskEdit.dueDate')"
					:rules="[dueAfterStart]"
					clearable
					data-testid="task-edit-due-date"
					class="mb-2"
				/>
				<p class="font-weight-bold mb-1">{{ t("pages.taskEdit.description") }}</p>
				<ClassicEditor
					v-model="description"
					class="mb-4"
					:placeholder="t('pages.taskEdit.descriptionPlaceholder')"
					data-testid="task-edit-description"
				/>

				<VCheckbox
					v-if="courseId"
					v-model="isDraft"
					:label="t('pages.taskEdit.draft')"
					hide-details
					data-testid="task-edit-draft"
				/>
				<VCheckbox
					v-if="courseId"
					v-model="publicSubmissions"
					:label="t('pages.taskEdit.publicSubmissions')"
					:hint="t('pages.taskEdit.publicSubmissionsHint')"
					persistent-hint
					data-testid="task-edit-public"
					class="mb-2"
				/>
				<VCheckbox
					v-if="courseId"
					v-model="teamSubmissions"
					:label="t('pages.taskEdit.teamSubmissions')"
					hide-details
					data-testid="task-edit-team"
				/>
				<VTextField
					v-if="courseId && teamSubmissions"
					v-model.number="maxTeamMembers"
					type="number"
					min="1"
					:label="t('pages.taskEdit.maxTeamMembers')"
					style="max-width: 260px"
					data-testid="task-edit-max-team"
				/>

				<div class="d-flex justify-end ga-2 mt-6">
					<VBtn variant="text" data-testid="task-edit-cancel" @click="leave()">{{ t("common.actions.cancel") }}</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="task-edit-save">
						{{ t("common.actions.save") }}
					</VBtn>
				</div>
			</VForm>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { serverMessage } from "@/components/homework/serverMessage";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LegacyTask, LegacyTaskInput, useLegacyHomeworkApi } from "@/composables/legacy-homework.api";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { BoardElementResponseType, CourseRoomsApiFactory, CoursesApiFactory } from "@api-server";
import { notifyError, notifySuccess, useAppStore } from "@data-app";
import { ClassicEditor } from "@feature-editor";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useLegacyHomeworkApi();
const appStore = useAppStore();
const coursesApi = CoursesApiFactory(undefined, "/v3", $axios);
const courseRoomsApi = CourseRoomsApiFactory(undefined, "/v3", $axios);

const taskId = computed(() => (route.params.id ? String(route.params.id) : undefined));
const isNew = computed(() => !taskId.value);

const name = ref("");
const courseId = ref<string | null>(typeof route.query.course === "string" ? route.query.course : null);
const lessonId = ref<string | null>(null);
const availableDate = ref(toLocalInput(new Date().toISOString()));
const dueDate = ref<string | null>(null);
const description = ref("");
const isDraft = ref(false);
const publicSubmissions = ref(false);
const teamSubmissions = ref(false);
const maxTeamMembers = ref<number | null>(null);
const existing = ref<LegacyTask>();
const saving = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

/** `YYYY-MM-DDTHH:mm` in local time, for the datetime-local input. */
function toLocalInput(iso: string): string {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const toIso = (local: string) => new Date(local).toISOString();

const required = (value: unknown) => (!!value && String(value).trim() !== "") || t("pages.taskEdit.required");
const dueAfterStart = (value: string | null) =>
	!value ||
	!availableDate.value ||
	new Date(value) > new Date(availableDate.value) ||
	t("pages.taskEdit.dueBeforeStart");

const { data: courses } = useSafeAxiosRunner(
	async () => (await coursesApi.courseControllerFindForUser(0, 100)).data.data
);
const courseOptions = computed(() => [
	{ id: null, title: t("pages.taskEdit.noCourse") },
	...(courses.value ?? []).map((c) => ({ id: c.id, title: c.title })),
]);

const lessonOptions = ref<{ id: string | null; title: string }[]>([]);
watch(
	courseId,
	async (id) => {
		lessonOptions.value = [{ id: null, title: t("pages.taskEdit.noTopic") }];
		if (!id) {
			lessonId.value = null;
			return;
		}
		const board = (await courseRoomsApi.courseRoomsControllerGetRoomBoard(id)).data;
		const lessons = board.elements
			.filter((e) => e.type === BoardElementResponseType.LESSON)
			.map((e) => e.content as { id: string; name: string });
		lessonOptions.value.push(...lessons.map((l) => ({ id: l.id, title: l.name })));
		if (lessonId.value && !lessons.some((l) => l.id === lessonId.value)) lessonId.value = null;
	},
	{ immediate: true }
);

// Substitution teachers may edit a course task but not move it to another course.
const isSubstitutionOnly = computed(() => {
	const course = existing.value?.courseId;
	const me = appStore.user?.id ?? "";
	return (
		!!course &&
		!course.teacherIds.includes(me) &&
		!!course.substitutionIds?.includes(me) &&
		existing.value?.teacherId !== me
	);
});

const { loadingState } = useSafeAxiosRunner(async () => {
	if (!taskId.value) return undefined;
	const task = await api.getTask(taskId.value);
	existing.value = task;
	name.value = task.name;
	courseId.value = task.courseId?._id ?? null;
	lessonId.value = task.lessonId ?? null;
	availableDate.value = toLocalInput(task.availableDate);
	dueDate.value = task.dueDate ? toLocalInput(task.dueDate) : null;
	description.value = task.description ?? "";
	isDraft.value = !!task.private;
	publicSubmissions.value = !!task.publicSubmissions;
	teamSubmissions.value = !!task.teamSubmissions;
	maxTeamMembers.value = task.maxTeamMembers ?? null;
	return task;
});

const leave = (id?: string) => {
	const returnUrl = typeof route.query.returnUrl === "string" ? route.query.returnUrl : undefined;
	if (id && isNew.value) return router.push(`/homework/${id}`);
	if (returnUrl) return router.push(`/${returnUrl.replace(/^\//, "")}`);
	return router.push(taskId.value ? `/homework/${taskId.value}` : "/tasks");
};

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	// A task without course is always private, as in the legacy form.
	const input: LegacyTaskInput = {
		name: name.value.trim(),
		description: description.value,
		courseId: courseId.value,
		lessonId: courseId.value ? lessonId.value : null,
		availableDate: toIso(availableDate.value),
		dueDate: dueDate.value ? toIso(dueDate.value) : null,
		private: !courseId.value || isDraft.value,
		publicSubmissions: !!courseId.value && publicSubmissions.value,
		teamSubmissions: !!courseId.value && teamSubmissions.value,
		maxTeamMembers: courseId.value && teamSubmissions.value && maxTeamMembers.value ? maxTeamMembers.value : null,
	};
	saving.value = true;
	try {
		const saved = taskId.value ? await api.updateTask(taskId.value, input) : await api.createTask(input);
		notifySuccess(t("pages.taskEdit.saved"));
		await leave(saved._id);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.taskEdit.error"));
	} finally {
		saving.value = false;
	}
};

useTitle(computed(() => buildPageTitle(isNew.value ? t("pages.taskEdit.createTitle") : t("pages.taskEdit.editTitle"))));
</script>
