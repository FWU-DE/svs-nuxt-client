<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="task-detail-title">
				{{ task ? `${task.courseName} - ${task.name}` : t("common.words.task") }}
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
							v-if="task.status.isDraft"
							size="small"
							class="ml-2"
							:prepend-icon="mdiPencilOutline"
							data-testid="task-detail-draft"
						>
							{{ t("components.organisms.TasksDashboardMain.tab.drafts") }}
						</VChip>
					</div>
					<div class="d-flex ga-2 flex-wrap">
						<VBtn
							variant="outlined"
							size="large"
							:prepend-icon="mdiFolderOpenOutline"
							:href="`/files/courses/${task.courseId}`"
							data-testid="task-detail-course-files"
						>
							{{ t("pages.taskDetail.toCourseFiles") }}
						</VBtn>
						<VBtn
							variant="outlined"
							size="large"
							:prepend-icon="mdiSchoolOutline"
							:href="`/courses/${task.courseId}`"
							data-testid="task-detail-course"
						>
							{{ t("pages.taskDetail.toCourse") }}
						</VBtn>
					</div>
				</div>

				<VTabs v-model="tab" color="primary" class="task-tabs mb-6">
					<VTab value="details" data-testid="task-detail-tab-details">{{ t("pages.taskDetail.tab.details") }}</VTab>
					<VTab value="submissions" data-testid="task-detail-tab-submissions">
						{{ t("pages.taskDetail.tab.submissions") }}
					</VTab>
				</VTabs>

				<VWindow v-model="tab">
					<VWindowItem value="details">
						<section class="px-2">
							<p v-if="task.lessonName" class="text-medium-emphasis" data-testid="task-detail-topic">
								{{ task.lessonName }}
							</p>
							<p v-if="plainDescription" data-testid="task-detail-description-text">{{ plainDescription }}</p>
							<RenderHTML
								v-else-if="htmlDescription"
								:html="htmlDescription"
								data-testid="task-detail-description-html"
							/>
							<p v-else class="text-medium-emphasis" data-testid="task-detail-no-description">
								{{ t("pages.taskDetail.noDescription") }}
							</p>
						</section>
					</VWindowItem>

					<VWindowItem value="submissions" :eager="true">
						<section data-testid="task-detail-submissions">
							<VRow class="mb-2">
								<VCol cols="12" sm="4">
									<div class="text-caption">{{ t("components.molecules.TaskItemTeacher.submitted") }}</div>
									<div class="text-h6" data-testid="task-detail-submitted">{{ task.status.submitted }}</div>
								</VCol>
								<VCol cols="12" sm="4">
									<div class="text-caption">{{ t("components.molecules.TaskItemTeacher.graded") }}</div>
									<div class="text-h6" data-testid="task-detail-graded">{{ task.status.graded }}</div>
								</VCol>
								<VCol cols="12" sm="4">
									<div class="text-caption">{{ t("pages.taskDetail.maxSubmissions") }}</div>
									<div class="text-h6" data-testid="task-detail-max-submissions">
										{{ task.status.maxSubmissions }}
									</div>
								</VCol>
							</VRow>
							<SvsLoading :loading-state="submissionLoadingState">
								<VAlert
									v-if="submissionStatuses.length === 0"
									type="info"
									variant="tonal"
									data-testid="task-detail-submissions-empty"
								>
									{{ t("pages.taskDetail.submissions.empty") }}
								</VAlert>
								<VTable v-else data-testid="task-detail-submissions-list">
									<tbody>
										<tr
											v-for="status in submissionStatuses"
											:key="status.id"
											:data-testid="`submission-status-${status.id}`"
										>
											<td>{{ status.submitters.join(", ") }}</td>
											<td>
												{{
													status.isSubmitted
														? t("components.molecules.TaskItemTeacher.submitted")
														: t("pages.tasks.notGraded")
												}}
											</td>
											<td>
												{{
													status.isGraded
														? t("components.molecules.TaskItemTeacher.graded")
														: t("pages.tasks.notGraded")
												}}
											</td>
											<td>
												<span v-if="status.grade !== undefined">{{ t("pages.tasks.rating") }}: {{ status.grade }}</span>
											</td>
										</tr>
									</tbody>
								</VTable>
							</SvsLoading>
						</section>
					</VWindowItem>
				</VWindow>
			</div>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { formatUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { RichTextType, SubmissionApiFactory, TaskApiFactory } from "@api-server";
import { RenderHTML } from "@feature-render-html";
import { mdiFolderOpenOutline, mdiPencilOutline, mdiSchoolOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const tab = ref<"details" | "submissions">("details");
const taskId = computed(() => String(route.params.id ?? ""));
const tasksApi = TaskApiFactory(undefined, "/v3", $axios);
const submissionApi = SubmissionApiFactory(undefined, "/v3", $axios);

// The server has no route for a single task and caps `limit` at 100, so page
// through the open tasks and then the finished ones until the task turns up.
const TASK_PAGE_SIZE = 100;

type TaskPage = (skip: number, limit: number) => ReturnType<typeof tasksApi.taskControllerFindAll>;

const findTaskIn = async (fetchPage: TaskPage, id: string) => {
	for (let skip = 0; ; skip += TASK_PAGE_SIZE) {
		const { data } = await fetchPage(skip, TASK_PAGE_SIZE);
		const match = data.data.find((item) => item.id === id);
		if (match || skip + TASK_PAGE_SIZE >= data.total) return match;
	}
};

const { data: task, loadingState } = useSafeAxiosRunner(
	async () =>
		(await findTaskIn((skip, limit) => tasksApi.taskControllerFindAll(skip, limit), taskId.value)) ??
		(await findTaskIn((skip, limit) => tasksApi.taskControllerFindAllFinished(skip, limit), taskId.value))
);

const { data: submissionStatusData, loadingState: submissionLoadingState } = useSafeAxiosRunner(async () => {
	if (!taskId.value) return [];
	const response = await submissionApi.submissionControllerFindStatusesByTask(taskId.value);
	return response.data.data;
});

const submissionStatuses = computed(() => submissionStatusData.value ?? []);

const plainDescription = computed(() =>
	task.value?.description?.type === RichTextType.PLAIN_TEXT ? task.value.description.content : undefined
);
const htmlDescription = computed(() =>
	task.value?.description && task.value.description.type !== RichTextType.PLAIN_TEXT
		? task.value.description.content
		: undefined
);

// Legacy header line: "<available> bis: <due>".
const dateRange = computed(() =>
	[
		task.value?.availableDate ? formatUtc(task.value.availableDate, "dateTime") : undefined,
		task.value?.dueDate ? `${t("pages.taskDetail.till")}: ${formatUtc(task.value.dueDate, "dateTime")}` : undefined,
	]
		.filter(Boolean)
		.join(" ")
);

useTitle(computed(() => buildPageTitle(task.value?.name ?? t("common.words.task"))));
</script>

<style lang="scss" scoped>
.task-tabs {
	border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
