<template>
	<section class="px-2" data-testid="task-feedback">
		<p v-if="grade !== undefined" data-testid="task-feedback-grade">
			{{ t("pages.taskDetail.feedback.solvedPercent", { grade }) }}
		</p>
		<RenderHTML v-if="submission?.gradeComment" :html="submission.gradeComment" data-testid="task-feedback-comment" />
		<p v-else-if="grade === undefined" class="text-medium-emphasis" data-testid="task-feedback-none">
			{{ t("pages.taskDetail.feedback.none") }}
		</p>
		<TaskFiles
			v-if="submission"
			:parent-id="submission._id"
			:parent-type="FileRecordParent.GRADINGS"
			:label="t('pages.taskDetail.feedback.files')"
			:empty-text="t('pages.taskDetail.files.none')"
			test-id="task-feedback-files"
			class="mt-4"
		/>
	</section>
</template>

<script setup lang="ts">
import TaskFiles from "./TaskFiles.vue";
import { LegacySubmission } from "@/composables/legacy-homework.api";
import { FileRecordParent } from "@/types/file/File";
import { RenderHTML } from "@feature-render-html";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ submission?: LegacySubmission }>();
const { t } = useI18n();

const grade = computed(() => (typeof props.submission?.grade === "number" ? props.submission.grade : undefined));
</script>
