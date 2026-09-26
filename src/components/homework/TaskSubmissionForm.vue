<template>
	<section class="px-2" data-testid="task-submission-form">
		<VAlert v-if="submission?.submitted" type="success" variant="tonal" class="mb-4" data-testid="task-submission-done">
			{{ t("pages.taskDetail.submission.done") }}
		</VAlert>

		<div v-if="task.teamSubmissions" class="mb-4" data-testid="task-submission-team">
			<p class="font-weight-bold mb-1">
				{{ t("pages.taskDetail.submission.teamSubmission") }}
				<span v-if="task.maxTeamMembers"
					>({{ t("pages.taskDetail.submission.maxTeamSize", { max: task.maxTeamMembers }) }})</span
				>
			</p>
			<VAutocomplete
				v-model="teamMembers"
				:items="teamOptions"
				item-title="name"
				item-value="id"
				multiple
				chips
				closable-chips
				:label="t('pages.taskDetail.submission.chooseTeamMembers')"
				data-testid="task-submission-team-select"
			/>
		</div>

		<p class="font-weight-bold mb-1">{{ t("pages.taskDetail.submission.textDelivery") }}</p>
		<ClassicEditor
			v-model="comment"
			class="mb-4"
			:placeholder="t('pages.taskDetail.submission.placeholder')"
			data-testid="task-submission-comment"
		/>

		<TaskFiles
			:parent-id="submission?._id"
			:parent-type="FileRecordParent.SUBMISSIONS"
			:label="t('pages.taskDetail.submission.fileUpload')"
			:empty-text="submission ? t('pages.taskDetail.files.none') : t('pages.taskDetail.submission.saveFirst')"
			editable
			test-id="task-submission-files"
			class="mb-4"
		/>

		<div class="d-flex ga-2 flex-wrap">
			<VBtn
				v-if="!submission?.submitted"
				variant="outlined"
				:loading="saving === 'draft'"
				data-testid="task-submission-save-draft"
				@click="save(false)"
			>
				{{ t("pages.taskDetail.submission.saveDraft") }}
			</VBtn>
			<VBtn
				color="primary"
				variant="flat"
				:loading="saving === 'submit'"
				data-testid="task-submission-submit"
				@click="save(true)"
			>
				{{ t("pages.taskDetail.submission.submit") }}
			</VBtn>
		</div>
	</section>
</template>

<script setup lang="ts">
import { serverMessage } from "./serverMessage";
import TaskFiles from "./TaskFiles.vue";
import {
	idOf,
	LegacySubmission,
	LegacyTask,
	LegacyUser,
	useLegacyHomeworkApi,
} from "@/composables/legacy-homework.api";
import { FileRecordParent } from "@/types/file/File";
import { notifyError, notifySuccess } from "@data-app";
import { ClassicEditor } from "@feature-editor";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	task: LegacyTask;
	submission?: LegacySubmission;
	/** Students of the course, for team members. */
	students: LegacyUser[];
	currentUserId: string;
	schoolId: string;
}>();
const emit = defineEmits<{ (e: "saved", submission: LegacySubmission): void }>();

const { t } = useI18n();
const api = useLegacyHomeworkApi();

const comment = ref("");
const teamMembers = ref<string[]>([]);
const saving = ref<"draft" | "submit">();

watch(
	() => props.submission,
	(submission) => {
		comment.value = submission?.comment ?? "";
		const team = (submission?.teamMembers ?? []).map((m) => idOf(m)).filter((id): id is string => !!id);
		teamMembers.value = team.length ? team : [props.currentUserId];
	},
	{ immediate: true }
);

const teamOptions = computed(() =>
	props.students.map((s) => ({
		id: s._id,
		name: `${s.firstName} ${s.lastName}`,
		props: { disabled: s._id === props.currentUserId },
	}))
);

const save = async (submitted: boolean) => {
	saving.value = submitted ? "submit" : "draft";
	const team = props.task.teamSubmissions
		? Array.from(new Set([props.currentUserId, ...teamMembers.value]))
		: undefined;
	try {
		const saved = props.submission
			? await api.updateSubmission(props.submission._id, { comment: comment.value, submitted, teamMembers: team })
			: await api.createSubmission({
					homeworkId: props.task._id,
					schoolId: props.schoolId,
					studentId: props.currentUserId,
					comment: comment.value,
					submitted,
					teamMembers: team,
				});
		notifySuccess(submitted ? t("pages.taskDetail.submission.submitted") : t("pages.taskDetail.submission.saved"));
		emit("saved", saved);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.taskDetail.submission.error"));
	} finally {
		saving.value = undefined;
	}
};
</script>
