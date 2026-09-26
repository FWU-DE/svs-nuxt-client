<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<div class="d-flex align-center justify-space-between">
				<h1 data-testid="topic-title">{{ lesson?.name ?? "" }}</h1>
				<VBtn
					v-if="canEdit"
					icon
					variant="outlined"
					size="small"
					:to="editLink"
					:aria-label="t('legacy.global.button.edit')"
					data-testid="edit-icon-pencil"
				>
					<VIcon :icon="mdiPencilOutline" />
				</VBtn>
			</div>
		</template>

		<SvsLoading :loading-state="loadingState">
			<section v-if="lesson" data-testid="section-topic">
				<div
					v-for="(block, index) in visibleContents"
					:key="index"
					class="content-block mb-6"
					data-testid="topic-content"
				>
					<h2 v-if="block.title" class="text-h4">{{ block.title }}</h2>
					<RenderHTML v-if="block.component === 'text'" :html="String(block.content?.text ?? '')" />
					<div v-else-if="block.component === 'geoGebra'">
						<a
							:href="`https://geogebra.org/m/${block.content?.materialId}`"
							target="geogebra"
							rel="nofollow noopener"
							data-testid="topic-geogebra"
						>
							{{ t("legacy.courses._course.topic.link.geoGebraMaterial", { materialId: block.content?.materialId }) }}
						</a>
						<p class="text-medium-emphasis">{{ t("legacy.courses._course.topic.text.externalLinkToGeoGebra") }}</p>
					</div>
					<div v-else-if="block.component === 'internal'">
						<iframe :src="internalUrl(block)" class="content-frame" :title="block.title" />
						<div class="text-right">
							<a :href="String(block.content?.url ?? '')" target="_blank">{{ t("legacy.global.link.openInNewTab") }}</a>
						</div>
					</div>
					<VRow v-else-if="block.component === 'resources'">
						<VCol v-for="(resource, i) in resources(block)" :key="i" cols="12" md="6">
							<VCard variant="outlined" class="h-100">
								<VCardTitle class="text-wrap">
									<a :href="resource.url" target="_blank" rel="noopener">{{ resource.title }}</a>
								</VCardTitle>
								<VCardText>
									<div v-if="isBrb" class="external-source-warning mb-2">
										<strong>{{ t("legacy.topic._topic.text.warningMain") }}</strong>
										<div>{{ t("legacy.topic._topic.text.warningFooter") }}</div>
									</div>
									{{ resource.description }}
								</VCardText>
							</VCard>
						</VCol>
					</VRow>
				</div>

				<div v-if="lesson.materials.length" class="mb-6" data-testid="topic-materials">
					<h2 class="text-h5">{{ t("legacy.topic._topic.headline.savedTeachingMaterials") }}</h2>
					<VRow>
						<VCol v-for="material in lesson.materials" :key="material._id" cols="12" md="6">
							<VCard variant="outlined">
								<VCardTitle class="text-wrap">
									<a :href="material.url" target="_blank" rel="noopener">{{ material.title }}</a>
								</VCardTitle>
							</VCard>
						</VCol>
					</VRow>
				</div>

				<div v-if="canEdit" class="d-flex justify-end mb-4">
					<VBtn color="primary" variant="flat" :to="editLink" data-testid="topic-button-edit">
						{{ isGroupTopic ? t("legacy.global.button.editTopic") : t("legacy.global.button.edit") }}
					</VBtn>
				</div>

				<template v-if="!isGroupTopic">
					<VDivider class="mb-4" />
					<VRow>
						<VCol cols="12" sm="6" data-testid="topic-tasks">
							<div class="d-flex align-center justify-space-between mb-2">
								<h2 class="text-h4 ma-0">
									{{ t("legacy.global.headline.assignedTasks") }} <small>({{ tasks.length }})</small>
								</h2>
								<VBtn
									v-if="canCreateTask"
									variant="outlined"
									size="small"
									:prepend-icon="mdiPlus"
									:to="newTaskLink(false)"
									data-testid="topic-add-task"
								>
									{{ t("legacy.global.button.addTask") }}
								</VBtn>
							</div>
							<LegacyScCard
								v-for="task in tasks"
								:key="task._id"
								class="mb-3"
								:title="task.name"
								:secondary-title="task.dueDate ? formatDate(task.dueDate) : undefined"
								:background="courseColor"
								:to="`/homework/${task._id}`"
							/>
						</VCol>
						<VCol v-if="isTeacher" cols="12" sm="6" data-testid="topic-drafts">
							<div class="d-flex align-center justify-space-between mb-2">
								<h2 class="text-h4 ma-0">
									{{ t("legacy.global.headline.draftTasks") }} <small>({{ drafts.length }})</small>
								</h2>
								<VBtn
									v-if="canCreateTask"
									variant="outlined"
									size="small"
									:prepend-icon="mdiPlus"
									:to="newTaskLink(true)"
									data-testid="topic-add-draft"
								>
									{{ t("legacy.global.button.addDraftTask") }}
								</VBtn>
							</div>
							<LegacyScCard
								v-for="task in drafts"
								:key="task._id"
								class="mb-3"
								:title="task.name"
								:secondary-title="task.dueDate ? formatDate(task.dueDate) : undefined"
								:background="courseColor"
								:to="`/homework/${task._id}`"
							/>
						</VCol>
					</VRow>
				</template>
			</section>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// A topic of a course or a course group (legacy views/topic/topic.hbs): its visible content
// blocks, saved materials and, for course topics, the tasks that belong to it.
import LegacyScCard from "@/components/legacy/LegacyScCard.vue";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LegacyGroupTask, Lesson, LessonContent, useLegacyCourseApi } from "@/composables/legacy-course.api";
import { buildPageTitle } from "@/utils/pageTitle";
import { Permission, SchulcloudTheme } from "@api-server";
import { useAppStore } from "@data-app";
import { useEnvConfig } from "@data-env";
import { RenderHTML } from "@feature-render-html";
import { mdiPencilOutline, mdiPlus } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import dayjs from "dayjs";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

type Resource = { url?: string; title?: string; description?: string };

const { t } = useI18n();
const route = useRoute();
const api = useLegacyCourseApi();
const appStore = useAppStore();

const courseId = computed(() => String(route.params.courseId));
const topicId = computed(() => String(route.params.topicId));
const courseGroupId = computed(() =>
	typeof route.query.courseGroup === "string" ? route.query.courseGroup : undefined
);

const lesson = ref<Lesson>();
const courseName = ref("");
const courseColor = ref<string>();
const groupName = ref<string>();
const isTeacher = ref(false);
const allTasks = ref<LegacyGroupTask[]>([]);

const isGroupTopic = computed(() => !!lesson.value?.courseGroupId);
const isBrb = computed(() => useEnvConfig().value.SC_THEME === SchulcloudTheme.BRB);
const canEdit = computed(() => isGroupTopic.value || appStore.userPermissions.includes(Permission.COURSE_EDIT));
const canCreateTask = computed(() => isTeacher.value && appStore.userPermissions.includes(Permission.HOMEWORK_CREATE));

// Etherpads are switched off in this installation, as `FEATURE_ETHERPAD_ENABLED` hides them in the product.
const visibleContents = computed(() =>
	(lesson.value?.contents ?? []).filter((block) => !block.hidden && block.component !== "Etherpad")
);
const tasks = computed(() => allTasks.value.filter((task) => !task.private));
const drafts = computed(() => allTasks.value.filter((task) => task.private));

const editLink = computed(() => {
	const group = lesson.value?.courseGroupId;
	return `/courses/${courseId.value}/topics/${topicId.value}/edit${group ? `?courseGroup=${group}` : ""}`;
});

const newTaskLink = (draft: boolean) =>
	`/homework/new?course=${courseId.value}&topic=${topicId.value}${draft ? "&private=true" : ""}` +
	`&returnUrl=courses/${courseId.value}/topics/${topicId.value}`;

const internalUrl = (block: LessonContent) => `${String(block.content?.url ?? "")}?inline=true`;
const resources = (block: LessonContent) => (block.content?.resources as Resource[] | undefined) ?? [];
const formatDate = (date: string) => dayjs(date).format("DD.MM.YY HH:mm");

const { loadingState } = useSafeAxiosRunner(async () => {
	const [loaded, course] = await Promise.all([api.getLesson(topicId.value), api.getCourse(courseId.value)]);
	lesson.value = loaded;
	courseName.value = course.name;
	courseColor.value = course.color;
	const me = appStore.user?.id ?? "";
	isTeacher.value = course.teacherIds.includes(me) || course.substitutionIds.includes(me);
	const groupId = loaded.courseGroupId ?? courseGroupId.value;
	if (groupId) {
		groupName.value = (await api.getGroup(groupId)).name;
	} else {
		const found = await api.findTasks({ courseId: courseId.value, lessonId: topicId.value, archived: { $ne: me } });
		allTasks.value = found.sort((a, b) => ((a.dueDate ?? "") > (b.dueDate ?? "") ? 1 : -1));
	}
	return loaded;
});

const breadcrumbs = computed<Breadcrumb[]>(() => {
	const crumbs: Breadcrumb[] = [
		{ title: t("common.words.courses"), to: "/rooms/courses-overview" },
		{ title: courseName.value, to: `/rooms/${courseId.value}` },
	];
	const groupId = lesson.value?.courseGroupId;
	if (groupId && groupName.value) {
		crumbs.push({
			title: `${groupName.value} > ${t("legacy.global.headline.topics")}`,
			to: `/courses/${courseId.value}/groups/${groupId}`,
		});
	}
	return crumbs;
});

useTitle(computed(() => buildPageTitle(lesson.value?.name ?? "")));
</script>

<style lang="scss" scoped>
.content-frame {
	width: 100%;
	height: 400px;
	resize: vertical;
	overflow: auto;
	border: 1px solid rgba(0, 0, 0, 0.12);
}

.external-source-warning {
	font-size: 0.875rem;
}
</style>
