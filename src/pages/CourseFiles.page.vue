<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs">
		<template #header>
			<div class="d-flex align-center flex-wrap ga-2 w-100">
				<h1 class="flex-grow-1" data-testid="course-files-title">{{ t("pages.files.legacy.courseTitle") }}</h1>
				<VBtn
					v-if="courseId"
					variant="outlined"
					:prepend-icon="mdiAccountGroupOutline"
					:to="`/rooms/${courseId}`"
					data-testid="course-files-to-course"
				>
					{{ t("pages.files.legacy.toCourse") }}
				</VBtn>
			</div>
		</template>

		<template v-if="!courseId">
			<VProgressLinear v-if="loadingCourses" indeterminate />
			<p v-else-if="courses.length === 0" class="text-medium-emphasis" data-testid="course-files-empty">
				{{ t("pages.folder.emptyState") }}
			</p>
			<template v-else>
				<h2 class="text-subtitle-1 font-weight-bold py-3">{{ t("pages.files.legacy.folders") }}</h2>
				<RouterLink
					v-for="course in courses"
					:key="course.id"
					:to="`/files/courses/${course.id}`"
					class="scope-card"
					:aria-label="t('pages.files.legacy.openFolder', { name: course.title })"
					:data-testid="`course-files-course-${course.id}`"
				>
					<VIcon :icon="mdiFolder" class="mr-2" color="#f8c34f" />
					<strong>{{ course.title }}</strong>
				</RouterLink>
			</template>
		</template>

		<LegacyFileBrowser
			v-else-if="userId"
			:owner-id="courseId"
			:parent-id="folderId"
			:root-id="courseId"
			:root-name="courseTitle"
			@open-folder="(folder) => router.push(`/files/courses/${courseId}/${folder._id}`)"
		/>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useLegacyFolderBreadcrumbs } from "@/components/legacy/files/legacy-folder-breadcrumbs.composable";
import LegacyFileBrowser from "@/components/legacy/files/LegacyFileBrowser.vue";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { CourseMetadataResponse, CoursesApiFactory } from "@api-server";
import { useAppStoreRefs } from "@data-app";
import { mdiAccountGroupOutline, mdiFolder } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { user } = useAppStoreRefs();
const coursesApi = CoursesApiFactory(undefined, "/v3", $axios);

useTitle(buildPageTitle(t("pages.files.legacy.courseTitle")));

const userId = computed(() => user.value?.id);
const courseId = computed(() => (route.params.courseId as string | undefined) || undefined);
const folderId = computed(() => (route.params.folderId as string | undefined) || undefined);

const courses = ref<CourseMetadataResponse[]>([]);
const loadingCourses = ref(true);

onMounted(async () => {
	try {
		// The server caps `limit` at 100; page through all of the user's courses.
		const all: CourseMetadataResponse[] = [];
		for (let skip = 0; ; skip += 100) {
			const { data } = await coursesApi.courseControllerFindForUser(skip, 100);
			all.push(...data.data);
			if (skip + 100 >= data.total) break;
		}
		courses.value = all;
	} catch {
		courses.value = [];
	} finally {
		loadingCourses.value = false;
	}
});

const courseTitle = computed(() => courses.value.find((c) => c.id === courseId.value)?.title ?? "");

// "Dateien aus meinen Kursen › <Kurs> › <Ordner…>", as in the product.
const breadcrumbs = useLegacyFolderBreadcrumbs(
	folderId,
	computed(() => [
		{ title: t("pages.files.legacy.filesFromMyCourse"), to: "/files/courses" },
		...(courseId.value ? [{ title: courseTitle.value, to: `/files/courses/${courseId.value}` }] : []),
	]),
	(id) => `/files/courses/${courseId.value}/${id}`
);
</script>

<style lang="scss" scoped>
.scope-card {
	display: flex;
	align-items: center;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
	border-radius: 4px;
	padding: 0.75rem 1rem;
	margin-bottom: 0.75rem;
	color: inherit;
	text-decoration: none;
	background: rgb(var(--v-theme-surface));

	&:hover,
	&:focus-visible {
		background: rgba(var(--v-theme-on-surface), 0.04);
	}
}
</style>
