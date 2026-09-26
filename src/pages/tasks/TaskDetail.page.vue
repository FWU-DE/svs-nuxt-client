<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="task-detail-title">
				{{ task ? [task.courseId?.name, task.name].filter(Boolean).join(" - ") : t("common.words.task") }}
			</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="!task" type="warning" variant="tonal" data-testid="task-detail-missing">
				{{ t("pages.taskDetail.notFound") }}
			</VAlert>

			<div v-else data-testid="task-detail-card">
				<div class="d-flex justify-space-between align-start flex-wrap ga-4 mb-6">
					<div class="text-body-2" data-testid="task-detail-due">
						{{ dateRange }}
						<VChip
							v-if="task.private"
							size="small"
							class="ml-2"
							:prepend-icon="mdiPencilOutline"
							data-testid="task-detail-draft"
						>
							{{ t("components.organisms.TasksDashboardMain.tab.drafts") }}
						</VChip>
						<div v-if="!canManage && studentState" class="mt-1" data-testid="task-detail-student-state">
							{{ studentState }}
						</div>
						<div
							v-if="task.lessonHidden && !task.private"
							class="mt-1 text-medium-emphasis"
							data-testid="task-detail-lesson-hidden"
						>
							{{ t("pages.taskDetail.lessonHidden") }}
						</div>
					</div>
					<div v-if="courseId" class="d-flex ga-2 flex-wrap">
						<VBtn
							variant="outlined"
							size="large"
							:prepend-icon="mdiFolderOpenOutline"
							:to="`/files/courses/${courseId}`"
							data-testid="task-detail-course-files"
						>
							{{ t("pages.taskDetail.toCourseFiles") }}
						</VBtn>
						<VBtn
							variant="outlined"
							size="large"
							:prepend-icon="mdiSchoolOutline"
							:to="`/rooms/${courseId}`"
							data-testid="task-detail-course"
						>
							{{ t("pages.taskDetail.toCourse") }}
						</VBtn>
					</div>
				</div>

				<VTabs v-model="tab" color="primary" class="task-tabs mb-6">
					<VTab value="details" data-testid="task-detail-tab-details">{{ t("pages.taskDetail.tab.details") }}</VTab>
					<VTab v-if="showOwnSubmission" value="submission" data-testid="task-detail-tab-submission">
						{{ t("pages.taskDetail.tab.submission") }}
					</VTab>
					<VTab v-if="showFeedback" value="feedback" data-testid="task-detail-tab-feedback">
						{{ t("pages.taskDetail.tab.feedback") }}
					</VTab>
					<VTab v-if="showSubmissions" value="submissions" data-testid="task-detail-tab-submissions">
						{{ t("pages.taskDetail.tab.submissions") }}
					</VTab>
				</VTabs>

				<VWindow v-model="tab">
					<VWindowItem value="details">
						<section class="px-2">
							<div class="d-flex justify-end ga-2 flex-wrap mb-4 d-print-none">
								<VBtn variant="text" :prepend-icon="mdiPrinter" data-testid="task-detail-print" @click="print">
									{{ t("pages.taskDetail.print") }}
								</VBtn>
								<VBtn
									variant="outlined"
									:prepend-icon="isArchived ? mdiRestore : mdiArchiveOutline"
									:loading="archiving"
									data-testid="task-detail-archive"
									@click="toggleArchived"
								>
									{{ isArchived ? t("pages.taskDetail.restore") : t("pages.taskDetail.finish") }}
								</VBtn>
								<template v-if="canManage">
									<VBtn
										color="primary"
										variant="flat"
										:prepend-icon="mdiPencilOutline"
										:to="`/homework/${task._id}/edit`"
										data-testid="task-detail-edit"
									>
										{{ t("common.actions.edit") }}
									</VBtn>
									<VBtn
										variant="outlined"
										:prepend-icon="mdiTrashCanOutline"
										data-testid="task-detail-delete"
										@click="confirmDelete = true"
									>
										{{ t("common.actions.delete") }}
									</VBtn>
								</template>
							</div>
							<p v-if="task.lessonName" class="text-medium-emphasis" data-testid="task-detail-topic">
								{{ task.lessonName }}
							</p>
							<RenderHTML v-if="task.description" :html="task.description" data-testid="task-detail-description-html" />
							<p v-else class="text-medium-emphasis" data-testid="task-detail-no-description">
								{{ t("pages.taskDetail.noDescription") }}
							</p>
						</section>
					</VWindowItem>

					<VWindowItem v-if="showOwnSubmission" value="submission">
						<TaskSubmissionForm
							:task="task"
							:submission="mySubmission"
							:students="students"
							:current-user-id="currentUserId"
							:school-id="schoolId"
							@saved="onSubmissionSaved"
						/>
					</VWindowItem>

					<VWindowItem v-if="showFeedback" value="feedback">
						<TaskFeedback :submission="mySubmission" />
					</VWindowItem>

					<VWindowItem v-if="showSubmissions" value="submissions" :eager="true">
						<TaskSubmissionsTable
							:submissions="submissions"
							:students="students"
							:stats="task.stats"
							:can-grade="canManage"
							@graded="onSubmissionSaved"
						/>
					</VWindowItem>
				</VWindow>
			</div>
		</SvsLoading>

		<VDialog v-model="confirmDelete" max-width="480" data-testid="task-delete-dialog">
			<VCard>
				<VCardTitle>{{ t("common.actions.delete") }}</VCardTitle>
				<VCardText>{{ t("pages.taskDetail.confirmDelete", { name: task?.name ?? "" }) }}</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" data-testid="task-delete-cancel" @click="confirmDelete = false">{{
						t("common.actions.cancel")
					}}</VBtn>
					<VBtn
						color="primary"
						variant="flat"
						:loading="deleting"
						data-testid="task-delete-confirm"
						@click="deleteTask"
					>
						{{ t("common.actions.delete") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { serverMessage } from "@/components/homework/serverMessage";
import TaskFeedback from "@/components/homework/TaskFeedback.vue";
import TaskSubmissionForm from "@/components/homework/TaskSubmissionForm.vue";
import TaskSubmissionsTable from "@/components/homework/TaskSubmissionsTable.vue";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import {
	idOf,
	LegacySubmission,
	LegacyTask,
	LegacyUser,
	useLegacyHomeworkApi,
} from "@/composables/legacy-homework.api";
import { formatUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError, useAppStore } from "@data-app";
import { RenderHTML } from "@feature-render-html";
import {
	mdiArchiveOutline,
	mdiFolderOpenOutline,
	mdiPencilOutline,
	mdiPrinter,
	mdiRestore,
	mdiSchoolOutline,
	mdiTrashCanOutline,
} from "@icons/material";
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

const taskId = computed(() => String(route.params.id ?? ""));
const currentUserId = computed(() => appStore.user?.id ?? "");
const schoolId = computed(() => appStore.school?.id ?? "");
const tab = ref<"details" | "submission" | "feedback" | "submissions">("details");

const { data: loadedTask, loadingState, execute: reloadTask } = useSafeAxiosRunner(() => api.getTask(taskId.value));
const task = computed(() => loadedTask.value as LegacyTask | undefined);
const submissions = ref<LegacySubmission[]>([]);
const students = ref<LegacyUser[]>([]);

const courseId = computed(() => task.value?.courseId?._id);
const canManage = computed(() => {
	const current = task.value;
	if (!current) return false;
	if (current.isTeacher !== undefined) return current.isTeacher;
	const course = current.courseId;
	return (
		current.teacherId === currentUserId.value ||
		!!course?.teacherIds.includes(currentUserId.value) ||
		!!course?.substitutionIds?.includes(currentUserId.value)
	);
});

// Tabs as on the legacy task page: a private task has only the own submission;
// teachers see all submissions, students their submission, the feedback and —
// if the task allows it — the others' submissions.
const showOwnSubmission = computed(() => !!task.value && (task.value.private || !canManage.value));
const showFeedback = computed(() => !!task.value && !task.value.private && !canManage.value);
const showSubmissions = computed(
	() => !!task.value && !task.value.private && (canManage.value || !!task.value.publicSubmissions)
);

const mySubmission = computed(() =>
	submissions.value.find(
		(s) => idOf(s.studentId) === currentUserId.value || s.teamMembers.some((m) => idOf(m) === currentUserId.value)
	)
);

const loadSubmissions = async () => {
	submissions.value = await api.findSubmissions(taskId.value);
};

watch(task, async (current) => {
	if (!current) return;
	await loadSubmissions();
	if (current.courseId && (canManage.value || current.teamSubmissions || current.publicSubmissions)) {
		students.value = (await api.getCourseWithStudents(current.courseId._id)).userIds;
	}
});

const onSubmissionSaved = async () => {
	await loadSubmissions();
	await reloadTask();
};

const isArchived = computed(() => !!task.value?.archived.includes(currentUserId.value));
const archiving = ref(false);
const toggleArchived = async () => {
	if (!task.value) return;
	archiving.value = true;
	const archived = isArchived.value
		? task.value.archived.filter((id) => id !== currentUserId.value)
		: [...task.value.archived, currentUserId.value];
	try {
		await api.updateTask(task.value._id, { archived });
		await reloadTask();
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.taskDetail.error"));
	} finally {
		archiving.value = false;
	}
};

const confirmDelete = ref(false);
const deleting = ref(false);
const deleteTask = async () => {
	if (!task.value) return;
	deleting.value = true;
	try {
		await api.deleteTask(task.value._id);
		await router.push("/tasks");
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.taskDetail.error"));
	} finally {
		deleting.value = false;
		confirmDelete.value = false;
	}
};

const print = () => window.print();

// Legacy header line: "<available> bis: <due>".
const dateRange = computed(() => {
	const current = task.value;
	if (!current) return "";
	const available = formatUtc(current.availableDate, "dateTime");
	return current.dueDate
		? `${available} ${t("pages.taskDetail.till")}: ${formatUtc(current.dueDate, "dateTime")}`
		: `${available} ${t("pages.taskDetail.noDueDate")}`;
});

const studentState = computed(() => {
	const current = task.value;
	if (!current) return undefined;
	if (mySubmission.value?.submitted) return t("pages.taskDetail.state.done");
	if (current.dueDate && new Date(current.dueDate).getTime() < Date.now()) return t("pages.taskDetail.state.late");
	return undefined;
});

useTitle(computed(() => buildPageTitle(task.value?.name ?? t("common.words.task"))));
</script>

<style lang="scss" scoped>
.task-tabs {
	border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
