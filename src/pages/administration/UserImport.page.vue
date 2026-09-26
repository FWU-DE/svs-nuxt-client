<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="user-import-title">{{ title }}</h1>
		</template>

		<VForm ref="form" data-testid="user-import-form" @submit.prevent="submit">
			<p><RenderHTML :html="t('legacy.administration.form_Import.text.importUserData')" /></p>
			<p>
				<RenderHTML :html="t('legacy.administration.form_Import.text.youCanFindMoreInformationOnTheStructure')" />
			</p>
			<p>
				<img id="csv-import-example" :src="CsvExample" alt="" class="csv-example" data-testid="csv-example" />
			</p>
			<VFileInput
				v-model="file"
				:label="`${t('legacy.administration.form_Import.label.selectCSVFile')} (${t('legacy.administration.form_Import.label.fileSizeInfo')} ${maxFileSize})`"
				accept=".csv,text/csv,text/plain"
				:rules="[required]"
				show-size
				data-testid="csv-file"
			/>
			<VSelect
				v-model="schoolYear"
				:items="yearOptions"
				item-title="name"
				item-value="id"
				:label="t('legacy.administration.global.label.schoolYear')"
				:placeholder="t('legacy.administration.global.label.chooseSchoolYear')"
				data-testid="csv-school-year"
			/>
			<VCheckbox
				v-model="sendRegistration"
				:label="t('legacy.administration.form_Import.label.sendRegistrationLinkToUsers')"
				hide-details
				data-testid="csv-send-registration"
			/>
			<p>{{ t("legacy.administration.form_Import.text.alternativelyYouCanCallUpTheRegistration") }}</p>
			<p class="text-body-1 font-weight-medium">{{ t("legacy.administration.form_Import.text.attention") }}</p>

			<VAlert
				v-if="result"
				:type="result.type"
				variant="tonal"
				class="my-4"
				data-testid="csv-import-result"
				:text="result.message"
			/>

			<div class="d-flex justify-end ga-2 mt-4">
				<VBtn variant="text" data-testid="csv-import-cancel" @click="leave">{{
					t("legacy.global.button.cancel")
				}}</VBtn>
				<VBtn type="submit" color="primary" variant="flat" :loading="importing" data-testid="csv-import-submit">
					{{ t("legacy.global.button.import") }}
				</VBtn>
			</div>
		</VForm>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// CSV import of students or teachers (legacy views/administration/import.hbs with forms/form-import.hbs):
// the file, the school year for the classes of the file and whether the registration links go out at once.
import CsvExample from "@/assets/img/csv_example.png";
import { decodeCsvFile, importReportMessage, useLegacyUserImportApi } from "@/composables/legacy-user-import.api";
import { buildPageTitle } from "@/utils/pageTitle";
import { useSchoolStore } from "@data-app";
import { RenderHTML } from "@feature-render-html";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { isAxiosError } from "axios";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const props = defineProps<{ kind: "students" | "teachers" }>();

const { t } = useI18n();
const router = useRouter();
const schoolStore = useSchoolStore();
const api = useLegacyUserImportApi();

// `CSV_IMPORT_MAX_FILE_SIZE` of the legacy client (512000 bytes), as `writeFileSizePretty` shows it.
const maxFileSize = "500 KB";

const title = computed(() =>
	props.kind === "students"
		? t("legacy.administration.controller.headline.studentImport")
		: t("legacy.administration.controller.headline.teacherImport")
);
const overview = computed(() => `/administration/${props.kind}`);

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{
		title:
			props.kind === "students"
				? t("pages.administration.students.index.title")
				: t("pages.administration.teachers.index.title"),
		to: overview.value,
	},
	{ title: title.value, disabled: true },
]);

// `getSelectableYears`: the current, the next and the last school year.
const yearOptions = computed(() => {
	const years = schoolStore.schoolDetails?.years;
	return [years?.activeYear, years?.nextYear, years?.lastYear].filter((y) => !!y);
});
const schoolYear = ref<string | undefined>(
	schoolStore.schoolDetails?.currentYear?.id ?? schoolStore.schoolDetails?.years?.activeYear?.id
);

const file = ref<File | File[] | null>(null);
const sendRegistration = ref(false);
const importing = ref(false);
const result = ref<{ type: "success" | "warning" | "info" | "error"; message: string }>();
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();

const selectedFile = () => (Array.isArray(file.value) ? file.value[0] : file.value) ?? undefined;
const required = () => !!selectedFile() || t("pages.legacyPages.required");

const leave = () => router.push(overview.value);

const submit = async () => {
	if (!(await form.value?.validate())?.valid) return;
	const csv = selectedFile();
	const schoolId = schoolStore.schoolDetails?.id;
	if (!csv || !schoolId) return;
	importing.value = true;
	result.value = undefined;
	try {
		const report = await api.importCsv({
			schoolId,
			role: props.kind === "students" ? "student" : "teacher",
			schoolYear: schoolYear.value,
			sendEmails: sendRegistration.value,
			data: decodeCsvFile(await csv.arrayBuffer()),
		});
		result.value = { type: report.success ? "success" : "warning", message: importReportMessage(report, t) };
	} catch (error) {
		const timedOut = isAxiosError(error) && (error.code === "ECONNABORTED" || error.response?.status === 504);
		result.value = timedOut
			? { type: "info", message: t("legacy.administration.controller.text.importMayBeStillRunning") }
			: { type: "error", message: t("legacy.administration.controller.text.importFailed") };
	} finally {
		importing.value = false;
	}
};

useTitle(computed(() => buildPageTitle(title.value)));
</script>

<style scoped>
.csv-example {
	max-width: 100%;
}
</style>
