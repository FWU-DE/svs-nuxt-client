<template>
	<GroupSelectionDialog
		v-model:is-open="isOpen"
		:description="$t('feature-course-sync.StartNewCourseSyncDialog.text')"
		@confirm="onConfirm"
		@cancel="closeDialog"
	/>
</template>

<script setup lang="ts">
import GroupSelectionDialog from "./GroupSelectionDialog.vue";
import { GroupResponse } from "@api-server";
import { ModelRef } from "vue";
import { useRouter } from "vue-router";

const isOpen: ModelRef<boolean> = defineModel("isOpen", {
	type: Boolean,
	required: true,
});

const router = useRouter();

const onConfirm = async (selectedGroup: GroupResponse) => {
	await router.push(`/courses/add?syncedGroupId=${selectedGroup.id}`);
};

const closeDialog = () => {
	isOpen.value = false;
};
</script>
