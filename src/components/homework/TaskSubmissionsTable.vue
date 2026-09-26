<template>
	<section data-testid="task-submissions">
		<VAlert v-if="rows.length === 0" type="info" variant="tonal" data-testid="task-submissions-empty">
			{{ t("pages.taskDetail.submissions.none") }}
		</VAlert>
		<VTable v-else density="comfortable" data-testid="task-submissions-table">
			<thead>
				<tr>
					<th>{{ t("pages.taskDetail.submissions.team") }}</th>
					<th>
						{{ t("pages.taskDetail.submissions.submitted") }}
						<span v-if="stats" data-testid="task-submissions-count"
							>{{ stats.submissionCount }}/{{ stats.userCount }}</span
						>
					</th>
					<th>
						{{ t("pages.taskDetail.submissions.rating") }}
						<span v-if="stats?.averageGrade" data-testid="task-submissions-average">{{ stats.averageGrade }}%</span>
					</th>
					<th />
				</tr>
			</thead>
			<tbody>
				<template v-for="row in rows" :key="row.submission._id">
					<tr :data-testid="`task-submission-row-${row.submission._id}`">
						<td>{{ row.names }}</td>
						<td>
							<VIcon
								:icon="row.submission.submitted ? mdiCheck : mdiClose"
								:color="row.submission.submitted ? 'success' : undefined"
								size="small"
							/>
						</td>
						<td>{{ typeof row.submission.grade === "number" ? `${row.submission.grade}%` : "–" }}</td>
						<td class="text-right">
							<VBtn
								variant="text"
								size="small"
								:append-icon="expanded === row.submission._id ? mdiChevronUp : mdiChevronDown"
								:data-testid="`task-submission-toggle-${row.submission._id}`"
								@click="toggle(row.submission)"
							>
								{{ canGrade ? t("pages.taskDetail.submissions.grade") : t("pages.taskDetail.submissions.show") }}
							</VBtn>
						</td>
					</tr>
					<tr v-if="expanded === row.submission._id" :data-testid="`task-submission-detail-${row.submission._id}`">
						<td colspan="4" class="py-4">
							<p class="font-weight-bold mb-1">{{ t("pages.taskDetail.submission.textDelivery") }}</p>
							<RenderHTML v-if="row.submission.comment" :html="row.submission.comment" class="mb-3" />
							<p v-else class="text-medium-emphasis mb-3">{{ t("pages.taskDetail.submissions.noText") }}</p>
							<TaskFiles
								:parent-id="row.submission._id"
								:parent-type="FileRecordParent.SUBMISSIONS"
								:label="t('pages.taskDetail.submissions.submittedFiles')"
								:empty-text="t('pages.taskDetail.files.none')"
								:test-id="`task-submission-files-${row.submission._id}`"
								class="mb-4"
							/>
							<template v-if="canGrade">
								<VTextField
									v-model.number="gradeInput"
									type="number"
									min="0"
									max="100"
									:label="t('pages.taskDetail.grading.grade')"
									:suffix="t('pages.taskDetail.grading.inPercent')"
									style="max-width: 240px"
									data-testid="task-grading-grade"
								/>
								<p class="font-weight-bold mb-1">{{ t("pages.taskDetail.grading.comment") }}</p>
								<ClassicEditor v-model="commentInput" class="mb-3" data-testid="task-grading-comment" />
								<TaskFiles
									:parent-id="row.submission._id"
									:parent-type="FileRecordParent.GRADINGS"
									:label="t('pages.taskDetail.grading.files')"
									:empty-text="t('pages.taskDetail.files.none')"
									editable
									:test-id="`task-grading-files-${row.submission._id}`"
									class="mb-3"
								/>
								<VBtn
									color="primary"
									variant="flat"
									:loading="saving"
									data-testid="task-grading-save"
									@click="saveGrading(row.submission)"
								>
									{{ t("pages.taskDetail.grading.saveAndSend") }}
								</VBtn>
							</template>
						</td>
					</tr>
				</template>
			</tbody>
		</VTable>

		<div v-if="canGrade && missing.length" class="mt-4" data-testid="task-submissions-missing">
			<p class="font-weight-bold mb-1">{{ t("pages.taskDetail.submissions.noSubmissionYetFrom") }}</p>
			<p>{{ missing.map((s) => `${s.firstName} ${s.lastName}`).join(", ") }}</p>
		</div>
	</section>
</template>

<script setup lang="ts">
import { serverMessage } from "./serverMessage";
import TaskFiles from "./TaskFiles.vue";
import {
	idOf,
	LegacySubmission,
	LegacyTaskStats,
	LegacyUser,
	useLegacyHomeworkApi,
} from "@/composables/legacy-homework.api";
import { FileRecordParent } from "@/types/file/File";
import { notifyError, notifySuccess } from "@data-app";
import { ClassicEditor } from "@feature-editor";
import { RenderHTML } from "@feature-render-html";
import { mdiCheck, mdiChevronDown, mdiChevronUp, mdiClose } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	submissions: LegacySubmission[];
	/** Students of the course; those without a submission are listed below the table. */
	students: LegacyUser[];
	stats?: LegacyTaskStats;
	canGrade: boolean;
}>();
const emit = defineEmits<{ (e: "graded", submission: LegacySubmission): void }>();

const { t } = useI18n();
const api = useLegacyHomeworkApi();

const nameOf = (member: string | LegacyUser) => {
	if (typeof member !== "string") return `${member.firstName} ${member.lastName}`;
	const student = props.students.find((s) => s._id === member);
	return student ? `${student.firstName} ${student.lastName}` : "";
};

const rows = computed(() =>
	props.submissions.map((submission) => {
		const members = submission.teamMembers.length ? submission.teamMembers : [submission.studentId];
		return { submission, names: members.map(nameOf).filter(Boolean).join(", ") };
	})
);

const missing = computed(() => {
	const covered = new Set(
		props.submissions
			.flatMap((s) => [idOf(s.studentId), ...s.teamMembers.map((m) => idOf(m))])
			.filter((id): id is string => !!id)
	);
	return props.students.filter((s) => !covered.has(s._id));
});

const expanded = ref<string>();
const gradeInput = ref<number | undefined>();
const commentInput = ref("");
const saving = ref(false);

const toggle = (submission: LegacySubmission) => {
	if (expanded.value === submission._id) {
		expanded.value = undefined;
		return;
	}
	expanded.value = submission._id;
	gradeInput.value = submission.grade;
	commentInput.value = submission.gradeComment ?? "";
};

const saveGrading = async (submission: LegacySubmission) => {
	saving.value = true;
	try {
		const grade =
			typeof gradeInput.value === "number" && !Number.isNaN(gradeInput.value)
				? Math.round(gradeInput.value)
				: undefined;
		const saved = await api.updateSubmission(submission._id, { grade, gradeComment: commentInput.value, graded: true });
		notifySuccess(t("pages.taskDetail.grading.saved"));
		emit("graded", saved);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.taskDetail.grading.error"));
	} finally {
		saving.value = false;
	}
};
</script>
