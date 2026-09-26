<template>
	<SvsLoading :loading-state="loadingState">
		<div data-testid="course-groups">
			<template v-if="groups.length">
				<h2 class="text-h4 mb-4" data-testid="course-groups-header">
					{{
						canEditCourse
							? t("legacy.courses._course.groups.headline.studentGroups")
							: t("legacy.courses._course.groups.headline.myStudentGroups")
					}}
				</h2>
				<VRow>
					<VCol v-for="group in groups" :key="group._id" cols="12" sm="6">
						<RouterLink
							:to="`/courses/${roomId}/groups/${group._id}`"
							class="group-card"
							:aria-label="group.name"
							data-testid="group-name-entry"
						>
							<div class="text-h5 mb-2">{{ group.name }}</div>
							<div class="d-flex flex-wrap ga-1">
								<VChip v-for="member in group.userIds" :key="member._id" size="small" label>
									{{ member.firstName }} {{ member.lastName }}
								</VChip>
							</div>
						</RouterLink>
					</VCol>
				</VRow>
			</template>
			<div v-else class="empty-state text-center py-6" data-testid="course-groups-empty">
				<VIcon :icon="mdiAccountGroupOutline" size="96" color="grey-lighten-1" class="mb-4" />
				<template v-if="isArchived">
					<h2 class="text-h4 text-medium-emphasis">{{ t("legacy.courses._course.groups.headline.noGroups") }}</h2>
				</template>
				<template v-else-if="canCreate">
					<h2 class="text-h4">{{ t("legacy.courses._course.groups.headline.createGroup") }}</h2>
					<p class="text-medium-emphasis">{{ t("legacy.courses._course.groups.text.descriptionCourses") }}</p>
				</template>
				<h2 v-else class="text-h4 text-medium-emphasis">
					{{ t("legacy.courses._course.groups.headline.noGroupsYet") }}
				</h2>
			</div>

			<div v-if="canCreate && !isArchived" class="mt-4" :class="{ 'text-center': !groups.length }">
				<VBtn
					color="primary"
					variant="flat"
					:block="groups.length > 0"
					:to="`/courses/${roomId}/groups/add`"
					:aria-label="t('legacy.courses._course.groups.text.addGroup')"
					data-testid="add-course-group"
				>
					{{ t("legacy.courses._course.groups.button.createNewGroup") }}
				</VBtn>
			</div>
		</div>
	</SvsLoading>
</template>

<script setup lang="ts">
// The "Gruppen" tab of a course (legacy views/courses/components/groups.hbs): teachers see all
// student groups, students only their own; both may create groups when the role allows it.
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LegacyCourseGroupPopulated, useLegacyCourseApi } from "@/composables/legacy-course.api";
import { Permission } from "@api-server";
import { useAppStore } from "@data-app";
import { useCourseRoomDetailsStore } from "@data-course-rooms";
import { mdiAccountGroupOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";

// `role` comes along with every tab of the course page; the group list does not need it.
const props = defineProps<{ roomId: string; role?: string }>();

const { t } = useI18n();
const api = useLegacyCourseApi();
const appStore = useAppStore();
const { roomData } = storeToRefs(useCourseRoomDetailsStore());

const canEditCourse = computed(() => appStore.userPermissions.includes(Permission.COURSE_EDIT));
const canCreate = computed(() => appStore.userPermissions.includes(Permission.COURSEGROUP_CREATE));
const isArchived = computed(() => !!roomData.value?.isArchived);

const allGroups = ref<LegacyCourseGroupPopulated[]>([]);
const groups = computed(() =>
	canEditCourse.value
		? allGroups.value
		: allGroups.value.filter((group) => group.userIds.some((member) => member._id === appStore.user?.id))
);

const { loadingState } = useSafeAxiosRunner(async () => {
	allGroups.value = await api.findGroups(props.roomId);
	return allGroups.value;
});
</script>

<style lang="scss" scoped>
.group-card {
	display: block;
	height: 100%;
	padding: 16px;
	color: inherit;
	text-decoration: none;
	border-radius: 4px;
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.12),
		0 1px 2px rgba(0, 0, 0, 0.24);

	&:hover {
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.16),
			0 3px 6px rgba(0, 0, 0, 0.23);
	}
}
</style>
