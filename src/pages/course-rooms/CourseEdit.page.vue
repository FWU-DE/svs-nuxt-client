<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="course-edit-title">{{ title }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<!-- An archived course can only get a new end date (legacy "unarchive" form). -->
			<div v-if="isArchived" class="text-center" data-testid="course-archived">
				<h2 class="text-h4">{{ t("legacy.courses._course.edit.headline.courseIsArchieved", { coursename: name }) }}</h2>
				<p class="text-medium-emphasis">{{ t("legacy.courses._course.edit.text.toEditChangeDate") }}</p>
				<VForm ref="unarchiveForm" class="text-left" @submit.prevent="unarchive">
					<p class="font-weight-bold mb-1">{{ t("legacy.administration.global.label.timeSpan") }}</p>
					<VRow>
						<VCol cols="12" md="6">
							<VTextField v-model="startDate" type="date" :label="t('legacy.global.label.from')" disabled />
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="untilDate"
								type="date"
								:label="t('legacy.global.label.to')"
								:min="today"
								:rules="[required]"
								data-testid="course-unarchive-until"
							/>
						</VCol>
					</VRow>
					<div class="d-flex ga-2 justify-end">
						<VBtn
							v-if="canDelete"
							variant="outlined"
							class="mr-auto"
							data-testid="delete_course"
							@click="confirmDelete = true"
						>
							{{ t("legacy.courses.global.button.deleteCourse") }}
						</VBtn>
						<VBtn variant="text" @click="leave()">{{ t("legacy.global.button.cancel") }}</VBtn>
						<VBtn
							type="submit"
							color="primary"
							variant="flat"
							:loading="saving"
							data-testid="modal_delete_course_button"
						>
							{{ t("legacy.global.button.saveChanges") }}
						</VBtn>
					</div>
				</VForm>
			</div>

			<VForm v-else ref="form" data-testid="course-edit-form" @submit.prevent="save">
				<VTextField
					v-model="name"
					:label="t('legacy.global.label.nameOfTheCourse')"
					:placeholder="t('legacy.courses.global.input.mathsClass')"
					:rules="[required]"
					data-testid="coursename"
					class="mb-2"
				/>
				<VTextarea
					v-model="description"
					:label="t('legacy.courses.global.label.courseDescription')"
					rows="3"
					auto-grow
					data-testid="course-description"
					class="mb-2"
				/>

				<p class="font-weight-bold mb-1">{{ t("legacy.courses.global.label.courseColor") }}</p>
				<div class="d-flex flex-wrap ga-2 mb-6" role="radiogroup" data-testid="color-picker">
					<button
						v-for="option in colorOptions"
						:key="option"
						type="button"
						role="radio"
						:aria-checked="color === option"
						:aria-label="option"
						class="color-swatch"
						:class="{ selected: color === option }"
						:style="{ background: option }"
						data-testid="item"
						@click="color = option"
					/>
				</div>

				<VAutocomplete
					v-model="teacherIds"
					:items="teacherOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.administration.global.label.teachingTeacher')"
					:placeholder="t('legacy.courses.global.input.chooseTeacher')"
					:rules="[atLeastOneTeacher]"
					multiple
					chips
					closable-chips
					:disabled="isSynced"
					data-testid="teachersearch"
				/>
				<VAutocomplete
					v-model="substitutionIds"
					:items="teacherOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.courses._course.edit.label.substitute')"
					:placeholder="t('legacy.courses.global.input.chooseTeacher')"
					multiple
					chips
					closable-chips
					:disabled="isSynced"
					data-testid="substituent"
				/>
				<VAutocomplete
					v-model="classIds"
					:items="classOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.global.headline.classes')"
					:placeholder="t('legacy.courses.global.input.selectClasses')"
					:hint="t('legacy.administration.global.label.afterSavingAllStudentsAdded')"
					persistent-hint
					multiple
					chips
					closable-chips
					:disabled="isSynced"
					data-testid="classes"
					class="mb-2"
				/>
				<VAutocomplete
					v-model="userIds"
					:items="studentOptions"
					item-title="title"
					item-value="id"
					:label="t('legacy.administration.global.label.studentParticipants')"
					:placeholder="t('legacy.courses.global.input.selectStudents')"
					multiple
					chips
					closable-chips
					:disabled="isSynced"
					data-testid="pupils"
				/>

				<p class="font-weight-bold mt-4 mb-1">{{ t("legacy.administration.global.label.chooseDate") }}</p>
				<p class="mb-1">{{ t("legacy.administration.global.label.timeSpan") }}</p>
				<VRow>
					<VCol cols="12" md="6">
						<VTextField
							v-model="startDate"
							type="date"
							:label="t('legacy.global.label.from')"
							:disabled="isSynced"
							data-testid="date_start"
						/>
					</VCol>
					<VCol cols="12" md="6">
						<VTextField
							v-model="untilDate"
							type="date"
							:label="t('legacy.global.label.to')"
							:rules="[untilAfterStart]"
							:disabled="isSynced"
							data-testid="date_until"
						/>
					</VCol>
				</VRow>

				<VTable density="compact" class="mb-2" data-testid="course-time-section">
					<thead v-if="times.length">
						<tr>
							<th />
							<th>{{ t("legacy.administration.global.label.weekday") }}</th>
							<th>{{ t("legacy.administration.global.label.startOfLesson") }}</th>
							<th>{{ t("legacy.administration.global.label.lengthOfLesson") }}</th>
							<th>{{ t("legacy.global.label.room") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(time, index) in times" :key="time.key" class="course-time">
							<td>
								<VBtn
									icon
									variant="text"
									size="small"
									:aria-label="t('legacy.global.headline.delete')"
									data-testid="course-time-delete-button"
									@click="times.splice(index, 1)"
								>
									<VIcon :icon="mdiTrashCanOutline" />
								</VBtn>
							</td>
							<td>
								<VSelect
									v-model="time.weekday"
									:items="weekdays"
									density="compact"
									hide-details
									data-testid="choose-weekday"
								/>
							</td>
							<td>
								<VTextField
									v-model="time.startTime"
									type="time"
									density="compact"
									hide-details
									data-testid="start-lesson-time"
								/>
							</td>
							<td>
								<VTextField
									v-model.number="time.duration"
									type="number"
									min="0"
									density="compact"
									:placeholder="t('legacy.courses.global.input.inMinutes')"
									:rules="[notNegative]"
									hide-details="auto"
									data-testid="lesson-duration"
								/>
							</td>
							<td>
								<VTextField
									v-model="time.room"
									density="compact"
									:placeholder="t('legacy.courses.global.input.egRoom1-21')"
									hide-details
									data-testid="course-appointment-room"
								/>
							</td>
						</tr>
					</tbody>
				</VTable>
				<VBtn
					variant="text"
					color="primary"
					:prepend-icon="mdiPlusCircleOutline"
					data-testid="add-new-course-appointment"
					@click="addTime"
				>
					{{ t("legacy.courses._course.edit.button.addLesson") }}
				</VBtn>

				<div class="d-flex flex-wrap ga-2 mt-6">
					<VBtn
						v-if="canDelete"
						variant="outlined"
						class="mr-auto"
						data-testid="delete_course"
						@click="confirmDelete = true"
					>
						{{ t("legacy.courses.global.button.deleteCourse") }}
					</VBtn>
					<VSpacer v-else />
					<VBtn variant="text" data-testid="course-edit-cancel" @click="leave()">{{
						t("legacy.global.button.cancel")
					}}</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="modal-edit-course-button">
						{{ isNew ? t("legacy.courses.add.headline.addCourse") : t("legacy.global.button.saveChanges") }}
					</VBtn>
				</div>
			</VForm>
		</SvsLoading>

		<VDialog v-model="confirmDelete" max-width="520" data-testid="course-delete-dialog">
			<VCard>
				<VCardTitle>{{ t("legacy.global.text.areYouSure") }}</VCardTitle>
				<VCardText>
					<strong>{{ t("legacy.global.text.attention") }}</strong>
					{{ t("legacy.courses._course.edit.text.courseWillDelete") }}<br />
					{{ t("legacy.courses._course.edit.text.attentionDeletion") }}
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="confirmDelete = false">{{ t("legacy.global.button.cancel") }}</VBtn>
					<VBtn color="primary" variant="flat" data-testid="modal_delete_course_button" @click="deleteCourse">
						{{ t("legacy.global.headline.delete") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// Create or edit a course (legacy views/courses/create-course.hbs and edit-course.hbs): the same
// fields, the course times as weekly calendar events, delete for those who may.
import { serverMessage } from "@/components/homework/serverMessage";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LegacyCourseDetails, LegacyCourseInput, useLegacyCourseApi } from "@/composables/legacy-course.api";
import { personName, SchoolPerson, useLegacySchoolPeopleApi } from "@/composables/legacy-school-people.api";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError, notifySuccess, useAppStore, useSchoolStore } from "@data-app";
import { mdiPlusCircleOutline, mdiTrashCanOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import dayjs from "dayjs";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

type TimeRow = { key: number; _id?: string; weekday: number; startTime: string; duration: number | null; room: string };

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useLegacyCourseApi();
const people = useLegacySchoolPeopleApi();
const appStore = useAppStore();

// The colours the legacy client offers.
const COLORS = [
	"#455B6A",
	"#EC407A",
	"#D50000",
	"#EF6C00",
	"#827717",
	"#689F38",
	"#009688",
	"#0091EA",
	"#304FFE",
	"#D500F9",
	"#9C27B0",
	"#795548",
];
const MINUTE = 60 * 1000;

const courseId = computed(() => (route.params.id ? String(route.params.id) : undefined));
const isNew = computed(() => !courseId.value);
const title = computed(() =>
	isNew.value ? t("legacy.courses.add.headline.addCourse") : t("legacy.courses._course.edit.headline.editCourse")
);

const name = ref("");
const description = ref("");
const color = ref(COLORS[0]);
const teacherIds = ref<string[]>([]);
const substitutionIds = ref<string[]>([]);
const classIds = ref<string[]>([]);
const userIds = ref<string[]>([]);
const startDate = ref("");
const untilDate = ref("");
const times = ref<TimeRow[]>([]);
const isArchived = ref(false);
const isSynced = ref(false);
const mayDelete = ref(false);
const saving = ref(false);
const confirmDelete = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();
const unarchiveForm = ref<{ validate: () => Promise<{ valid: boolean }> }>();
let nextKey = 0;

const teacherOptions = ref<{ id: string; title: string }[]>([]);
const studentOptions = ref<{ id: string; title: string }[]>([]);
const classOptions = ref<{ id: string; title: string }[]>([]);
const colorOptions = computed(() => (COLORS.includes(color.value) ? COLORS : [color.value, ...COLORS]));
const canDelete = computed(() => !isNew.value && mayDelete.value);
const today = dayjs().format("YYYY-MM-DD");

const weekdays = computed(() =>
	["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day, value) => ({
		value,
		title: t(`legacy.global.text.${day}`),
	}))
);

const required = (value: string) => !!value?.trim() || t("pages.legacyPages.required");
const atLeastOneTeacher = (value: string[]) => value.length > 0 || t("legacy.courses.global.input.noCourseTeacher");
const untilAfterStart = (value: string) =>
	!value || !startDate.value || value >= startDate.value || t("legacy.courses.global.input.invalidTimeError");
const notNegative = (value: number | null) =>
	value == null || value >= 0 || t("legacy.courses.global.input.invalidDurationError");

const toInputDate = (iso?: string) => (iso ? dayjs(iso).format("YYYY-MM-DD") : "");
const toClock = (ms = 0) =>
	`${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor((ms % 3600000) / MINUTE)).padStart(2, "0")}`;
const fromClock = (clock: string) => {
	const [h, m] = clock.split(":").map(Number);
	return ((h || 0) * 60 + (m || 0)) * MINUTE;
};

const addTime = () => times.value.push({ key: nextKey++, weekday: 0, startTime: "", duration: null, room: "" });

const fill = (course: LegacyCourseDetails) => {
	name.value = course.name;
	description.value = course.description ?? "";
	color.value = course.color || COLORS[0];
	teacherIds.value = course.teacherIds ?? [];
	substitutionIds.value = course.substitutionIds ?? [];
	classIds.value = [...(course.classIds ?? []), ...(course.groupIds ?? [])];
	userIds.value = course.userIds ?? [];
	startDate.value = toInputDate(course.startDate);
	untilDate.value = toInputDate(course.untilDate);
	times.value = (course.times ?? []).map((time) => ({
		key: nextKey++,
		_id: time._id,
		weekday: time.weekday,
		startTime: toClock(time.startTime),
		duration: time.duration != null ? time.duration / MINUTE : null,
		room: time.room ?? "",
	}));
	isArchived.value = !!course.isArchived;
	isSynced.value = !!course.syncedWithGroup;
};

const { loadingState } = useSafeAxiosRunner(async () => {
	const [teachers, students, classes] = await Promise.all([
		people.listUsers("teachers"),
		people.listUsers("students").catch(() => []),
		people.listClasses().catch(() => []),
	]);
	teacherOptions.value = teachers.map((p) => ({ id: p._id, title: personName(p) }));
	studentOptions.value = students.map((p) => ({ id: p._id, title: personName(p) }));
	const years = new Map((useSchoolStore().schoolDetails?.years?.schoolYears ?? []).map((y) => [y.id, y.name]));
	classOptions.value = classes.map((c) => ({
		id: c._id,
		title: `${c.displayName ?? c.name ?? ""}${c.year && years.get(c.year) ? ` (${years.get(c.year)})` : ""}`,
	}));
	if (courseId.value) {
		const course = await api.getCourse(courseId.value);
		fill(course);
		const me = appStore.user?.id ?? "";
		// COURSE_DELETE of the course scope: the course's teachers and the school's administrators.
		mayDelete.value = course.teacherIds.includes(me) || appStore.isAdmin;
		// Members who are no students of the school (e.g. an administrator) keep their place, with their name.
		const unknown = [...teacherIds.value, ...substitutionIds.value, ...userIds.value].filter(
			(id) => !teacherOptions.value.some((o) => o.id === id) && !studentOptions.value.some((o) => o.id === id)
		);
		if (unknown.length) {
			const populated = await api.getCourseWithPeople(courseId.value, ["userIds", "teacherIds"]);
			const known = [
				...((populated.userIds as SchoolPerson[]) ?? []),
				...((populated.teacherIds as SchoolPerson[]) ?? []),
			];
			for (const person of known.filter((p) => unknown.includes(p._id))) {
				const option = { id: person._id, title: personName(person) };
				if (userIds.value.includes(person._id)) studentOptions.value.push(option);
				else teacherOptions.value.push(option);
			}
		}
	} else {
		// As the legacy form: the creating teacher teaches the course, for the current (or next) school year.
		if (appStore.isTeacher && appStore.user?.id) teacherIds.value = [appStore.user.id];
		const years = useSchoolStore().schoolDetails?.years;
		const year = years?.activeYear?.courseCreationInNextYear && years.nextYear ? years.nextYear : years?.activeYear;
		startDate.value = toInputDate(year?.startDate);
		untilDate.value = toInputDate(year?.endDate);
	}
	return true;
});

const redirectUrl = computed(() => (typeof route.query.redirectUrl === "string" ? route.query.redirectUrl : undefined));

const leave = (id?: string) => {
	if (redirectUrl.value) return router.push(redirectUrl.value);
	const target = id ?? courseId.value;
	return router.push(target ? `/rooms/${target}` : "/rooms/courses-overview");
};

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("common.words.courses"), to: "/rooms/courses-overview" },
	...(courseId.value ? [{ title: name.value, to: `/rooms/${courseId.value}` }] : []),
]);

/** The course times as weekly events of the calendar, as the legacy client keeps them. */
const syncCalendar = async (course: LegacyCourseDetails, replace: boolean) => {
	try {
		if (replace) await $axios.delete(`/v1/calendar/courses/${course._id}`);
		if (!course.startDate || !course.untilDate) return;
		for (const time of course.times ?? []) {
			await $axios.post("/v1/calendar", {
				summary: course.name,
				location: time.room,
				description: course.description,
				startDate: dayjs(course.startDate)
					.add(time.startTime ?? 0, "ms")
					.toISOString(),
				duration: time.duration,
				repeat_until: dayjs(course.untilDate).toISOString(),
				frequency: "WEEKLY",
				weekday: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][time.weekday],
				scopeId: course._id,
				courseId: course._id,
				courseTimeId: time._id,
			});
		}
	} catch {
		notifyError(t("legacy.courses._course.text.eventCouldNotBeSavedContactSupport"));
	}
};

const input = (): LegacyCourseInput => ({
	name: name.value.trim(),
	description: description.value,
	color: color.value,
	teacherIds: teacherIds.value,
	substitutionIds: substitutionIds.value,
	classIds: classIds.value,
	userIds: userIds.value,
	startDate: startDate.value ? dayjs(startDate.value).toISOString() : undefined,
	untilDate: untilDate.value ? dayjs(untilDate.value).toISOString() : undefined,
	times: times.value.map((time) => ({
		...(time._id ? { _id: time._id } : {}),
		weekday: time.weekday,
		startTime: fromClock(time.startTime),
		duration: (time.duration ?? 0) * MINUTE,
		room: time.room,
	})),
	features: [],
});

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	saving.value = true;
	try {
		if (courseId.value) {
			await api.updateCourse(courseId.value, input());
			await syncCalendar(await api.getCourse(courseId.value), true);
			notifySuccess(t("pages.courseEdit.saved"));
			await leave();
		} else {
			const created = await api.createCourse(input());
			await syncCalendar(created, false);
			notifySuccess(t("pages.courseEdit.created"));
			await leave(created._id);
		}
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

const unarchive = async () => {
	if (!courseId.value || !(await unarchiveForm.value?.validate())?.valid) return;
	saving.value = true;
	try {
		await $axios.delete(`/v1/calendar/courses/${courseId.value}`).catch(() => undefined);
		await api.updateCourse(courseId.value, { untilDate: dayjs(untilDate.value).toISOString() });
		const course = await api.getCourse(courseId.value);
		await syncCalendar(course, false);
		await leave();
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

const deleteCourse = async () => {
	if (!courseId.value) return;
	try {
		await api.deleteCourse(courseId.value);
		confirmDelete.value = false;
		await router.push(redirectUrl.value ?? "/rooms/courses-overview");
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	}
};

useTitle(computed(() => buildPageTitle(title.value)));
</script>

<style lang="scss" scoped>
.color-swatch {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	border: 2px solid transparent;
	cursor: pointer;

	&.selected {
		border-color: rgba(0, 0, 0, 0.87);
		box-shadow: 0 0 0 2px #fff inset;
	}
}
</style>
