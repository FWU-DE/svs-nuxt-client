<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<div class="d-flex align-center ga-4 flex-wrap">
				<VBtn variant="text" :prepend-icon="mdiArrowLeft" href="/tasks" data-testid="task-detail-back">
					{{ t("pages.taskDetail.back") }}
				</VBtn>
				<h1 data-testid="task-detail-title">{{ task?.name ?? t("common.words.task") }}</h1>
			</div>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="!task" type="warning" variant="tonal" data-testid="task-detail-missing">
				{{ t("pages.taskDetail.notFound") }}
			</VAlert>

			<VCard v-else variant="outlined" data-testid="task-detail-card">
				<VCardText>
					<div class="d-flex align-center ga-2 flex-wrap mb-4">
						<VChip :prepend-icon="mdiBookshelf" data-testid="task-detail-course">{{ task.courseName }}</VChip>
						<VChip v-if="task.lessonName" :prepend-icon="mdiFileTreeOutline" data-testid="task-detail-topic">
							{{ task.lessonName }}
						</VChip>
						<VChip v-if="task.dueDate" :prepend-icon="mdiCalendarOutline" data-testid="task-detail-due">
							{{ t("pages.tasks.labels.due") }} {{ formatUtc(task.dueDate, "dateTimeYY") }}
						</VChip>
						<VChip v-if="task.status.isDraft" :prepend-icon="mdiPencilOutline" data-testid="task-detail-draft">
							{{ t("components.organisms.TasksDashboardMain.tab.drafts") }}
						</VChip>
					</div>

					<section class="mb-6">
						<h2 class="text-h5 mb-2">{{ t("pages.taskDetail.description") }}</h2>
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

					<VRow>
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
							<div class="text-h6" data-testid="task-detail-max-submissions">{{ task.status.maxSubmissions }}</div>
						</VCol>
					</VRow>

					<VDivider class="my-6" />

					<section data-testid="task-detail-submissions">
						<h2 class="text-h5 mb-2">{{ t("pages.taskDetail.submissions") }}</h2>
						<SvsLoading :loading-state="submissionLoadingState">
							<VAlert
								v-if="submissionStatuses.length === 0"
								type="info"
								variant="tonal"
								data-testid="task-detail-submissions-empty"
							>
								{{ t("pages.taskDetail.submissions.empty") }}
							</VAlert>
							<VList v-else density="compact" data-testid="task-detail-submissions-list">
								<VListItem
									v-for="status in submissionStatuses"
									:key="status.id"
									:data-testid="`submission-status-${status.id}`"
								>
									<VListItemTitle>{{ status.submitters.join(", ") }}</VListItemTitle>
									<VListItemSubtitle>
										{{
											status.isSubmitted
												? t("components.molecules.TaskItemTeacher.submitted")
												: t("pages.tasks.notGraded")
										}}
										·
										{{
											status.isGraded ? t("components.molecules.TaskItemTeacher.graded") : t("pages.tasks.notGraded")
										}}
										<span v-if="status.grade !== undefined"> · {{ t("pages.tasks.rating") }}: {{ status.grade }}</span>
									</VListItemSubtitle>
								</VListItem>
							</VList>
						</SvsLoading>
					</section>
				</VCardText>
			</VCard>
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
import { mdiArrowLeft, mdiBookshelf, mdiCalendarOutline, mdiFileTreeOutline, mdiPencilOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const taskId = computed(() => String(route.params.id ?? ""));
const tasksApi = TaskApiFactory(undefined, "/v3", $axios);
const submissionApi = SubmissionApiFactory(undefined, "/v3", $axios);

const { data: task, loadingState } = useSafeAxiosRunner(async () => {
	const response = await tasksApi.taskControllerFindAll(0, 1000);
	return response.data.data.find((item) => item.id === taskId.value);
});

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

useTitle(computed(() => buildPageTitle(task.value?.name ?? t("common.words.task"))));
</script>
