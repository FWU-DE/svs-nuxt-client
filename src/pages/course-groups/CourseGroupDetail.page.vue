<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="course-group-title">{{ group?.name ?? "" }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<template v-if="group">
				<p class="text-body-1 mb-2" data-testid="course-group-members">
					{{ t("legacy.courses._course.groups._group.text.groupMembers") }}
					<VChip v-for="member in group.userIds" :key="member._id" size="small" color="primary" label class="mr-1">
						{{ member.firstName }} {{ member.lastName }}
					</VChip>
				</p>
				<p class="text-body-1 mb-6" data-testid="course-group-teachers">
					{{ t("legacy.courses._course.groups._group.text.responsibleTeachers") }}
					<VChip v-for="teacher in teachers" :key="teacher._id" size="small" color="primary" label class="mr-1">
						{{ teacher.firstName }} {{ teacher.lastName }}
					</VChip>
				</p>

				<section class="mb-6" data-testid="course-group-topics">
					<div class="d-flex align-center justify-space-between mb-2">
						<h2 class="text-h4 ma-0">{{ t("legacy.global.headline.topics") }}</h2>
						<VBtn
							v-if="!isArchived"
							color="primary"
							variant="flat"
							size="small"
							:prepend-icon="mdiPlus"
							:to="`/courses/${courseId}/topics/add?courseGroup=${groupId}`"
							data-testid="course-group-add-topic"
						>
							{{ t("legacy.courses._course.groups._group.link.addTopic") }}
						</VBtn>
					</div>
					<VList v-if="lessons.length" density="comfortable" class="pa-0">
						<VListItem
							v-for="lesson in lessons"
							:key="lesson._id"
							:to="`/courses/${courseId}/topics/${lesson._id}?courseGroup=${groupId}`"
							class="topic-row mb-1"
							data-testid="course-group-topic"
						>
							<VListItemTitle>{{ lesson.name }}</VListItemTitle>
							<template v-if="!isArchived" #append>
								<VBtn
									icon
									variant="text"
									size="small"
									:aria-label="t('legacy.global.button.editTopic')"
									:to="`/courses/${courseId}/topics/${lesson._id}/edit?courseGroup=${groupId}&returnUrl=courses/${courseId}/groups/${groupId}`"
									data-testid="course-group-topic-edit"
									@click.stop
								>
									<VIcon :icon="mdiPencilOutline" />
								</VBtn>
								<VBtn
									icon
									variant="text"
									size="small"
									:aria-label="t('legacy.global.headline.delete')"
									data-testid="course-group-topic-delete"
									@click.prevent.stop="lessonToDelete = lesson"
								>
									<VIcon :icon="mdiTrashCanOutline" />
								</VBtn>
							</template>
						</VListItem>
					</VList>
					<p v-else class="text-medium-emphasis">{{ t("legacy.courses._course.groups._group.text.noTopics") }}</p>
				</section>

				<section class="mb-6" data-testid="course-group-done">
					<h2 class="text-h4">{{ t("legacy.courses._course.groups._group.headline.doneGroupTasks") }}</h2>
					<VRow v-if="doneSubmissions.length">
						<VCol v-for="submission in doneSubmissions" :key="submission._id" cols="12" md="6" lg="4">
							<LegacyScCard
								:title="
									t('legacy.courses._course.groups._group.headline.homework', { name: submission.homeworkId.name })
								"
								:secondary-title="
									t('legacy.courses._course.groups._group.text.submittedOn', {
										ddmmyy_hhmm: formatDateTime(submission.updatedAt),
									})
								"
								:background="courseColor"
								:to="`/homework/${submission.homeworkId._id}`"
								:link-text="t('legacy.courses._course.groups._group.text.toTask')"
							>
								{{ plain(submission.homeworkId.description) }}
							</LegacyScCard>
						</VCol>
					</VRow>
					<p v-else class="text-medium-emphasis">{{ t("legacy.courses._course.groups._group.text.noSubmissions") }}</p>
				</section>

				<section class="mb-6" data-testid="course-group-open">
					<h2 class="text-h4">{{ t("legacy.courses._course.groups._group.headline.openGroupTasks") }}</h2>
					<VRow v-if="openTasks.length">
						<VCol v-for="task in openTasks" :key="task._id" cols="12" md="6" lg="4">
							<LegacyScCard
								:title="t('legacy.courses._course.groups._group.headline.homework', { name: task.name })"
								:secondary-title="
									task.dueDate
										? t('legacy.courses._course.groups._group.text.dueTo', { date: formatDateTime(task.dueDate) })
										: undefined
								"
								:background="courseColor"
								:to="`/homework/${task._id}`"
								:link-text="t('legacy.courses._course.groups._group.text.toTask')"
							>
								{{ plain(task.description) }}
							</LegacyScCard>
						</VCol>
					</VRow>
					<p v-else class="text-medium-emphasis">
						{{ t("legacy.courses._course.groups._group.text.noOpenGroupTasks") }}
					</p>
				</section>

				<div v-if="!isArchived" class="d-flex ga-2 flex-wrap">
					<VBtn
						color="primary"
						variant="flat"
						:prepend-icon="mdiPencilOutline"
						:to="`/courses/${courseId}/groups/${groupId}/edit`"
						data-testid="edit-group"
					>
						{{ t("legacy.courses._course.groups._group.link.editGroup") }}
					</VBtn>
					<VBtn
						variant="outlined"
						:prepend-icon="mdiTrashCanOutline"
						data-testid="delete-course-group"
						@click="confirmGroupDelete = true"
					>
						{{ t("legacy.courses._course.groups._group.link.deleteGroup") }}
					</VBtn>
				</div>
			</template>
		</SvsLoading>

		<VDialog
			:model-value="confirmGroupDelete || !!lessonToDelete"
			max-width="480"
			data-testid="course-group-delete-dialog"
		>
			<VCard>
				<VCardTitle>{{ t("legacy.global.text.areYouSure") }}</VCardTitle>
				<VCardText>{{ lessonToDelete ? lessonToDelete.name : group?.name }}</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" data-testid="course-group-delete-cancel" @click="closeDialog">
						{{ t("legacy.global.button.cancel") }}
					</VBtn>
					<VBtn color="primary" variant="flat" data-testid="delete-course-group-btn" @click="confirmDelete">
						{{ t("legacy.global.headline.delete") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// A student group of a course (legacy views/courses/courseGroup.hbs): members, teachers, the
// group's own topics, its team submissions and the team tasks it could still hand in.
import { serverMessage } from "@/components/homework/serverMessage";
import LegacyScCard from "@/components/legacy/LegacyScCard.vue";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import {
	LegacyCourseGroupPopulated,
	LegacyGroupSubmission,
	LegacyGroupTask,
	LegacyPerson,
	Lesson,
	useLegacyCourseApi,
} from "@/composables/legacy-course.api";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError } from "@data-app";
import { mdiPencilOutline, mdiPlus, mdiTrashCanOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import dayjs from "dayjs";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useLegacyCourseApi();

const courseId = computed(() => String(route.params.courseId));
const groupId = computed(() => String(route.params.groupId));

const group = ref<LegacyCourseGroupPopulated>();
const courseName = ref("");
const courseColor = ref<string>();
const isArchived = ref(false);
const teachers = ref<LegacyPerson[]>([]);
const lessons = ref<Lesson[]>([]);
const doneSubmissions = ref<LegacyGroupSubmission[]>([]);
const openTasks = ref<LegacyGroupTask[]>([]);

const confirmGroupDelete = ref(false);
const lessonToDelete = ref<Lesson>();

const formatDateTime = (date: string) => dayjs(date).format("DD.MM.YY HH:mm");
const plain = (html?: string) => {
	const text = new DOMParser().parseFromString(html ?? "", "text/html").body.textContent ?? "";
	return text.substring(0, 140);
};

const load = async () => {
	const [loadedGroup, loadedLessons, course, submissions, tasks] = await Promise.all([
		api.getGroup(groupId.value),
		api.findGroupLessons(groupId.value),
		api.getCourseWithPeople(courseId.value, ["teacherIds"]),
		api.findGroupSubmissions(groupId.value),
		api.findTasks({ courseId: courseId.value }),
	]);
	group.value = loadedGroup;
	lessons.value = loadedLessons;
	courseName.value = String(course.name ?? "");
	courseColor.value = course.color;
	isArchived.value = !!course.isArchived;
	teachers.value = (course.teacherIds as LegacyPerson[] | undefined) ?? [];
	doneSubmissions.value = submissions.filter((s) => s.homeworkId && typeof s.homeworkId === "object");
	// Team tasks without a submission of this group that the group is small enough for.
	const done = new Set(doneSubmissions.value.map((s) => s.homeworkId._id));
	openTasks.value = tasks.filter(
		(task) => task.teamSubmissions && (task.maxTeamMembers ?? 0) >= loadedGroup.userIds.length && !done.has(task._id)
	);
	return loadedGroup;
};

const { loadingState, execute } = useSafeAxiosRunner(load);

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("common.words.courses"), to: "/rooms/courses-overview" },
	{ title: courseName.value, to: `/rooms/${courseId.value}` },
	{ title: group.value?.name ?? "", disabled: true },
]);

const closeDialog = () => {
	confirmGroupDelete.value = false;
	lessonToDelete.value = undefined;
};

const confirmDelete = async () => {
	try {
		if (lessonToDelete.value) {
			await api.deleteLesson(lessonToDelete.value._id);
			closeDialog();
			await execute();
			return;
		}
		await api.deleteGroup(groupId.value);
		closeDialog();
		await router.push({ path: `/rooms/${courseId.value}`, query: { tab: "groups" } });
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	}
};

useTitle(computed(() => buildPageTitle(group.value?.name ?? "")));
</script>

<style lang="scss" scoped>
.topic-row {
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 4px;
}
</style>
