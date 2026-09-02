<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="onboarding-title" class="d-flex align-center">
				<VIcon :icon="mdiLightbulbOnOutline" class="mr-3" color="primary" />
				Willkommen in der {{ instanceTitle }}
			</h1>
			<p class="text-medium-emphasis mt-2 mb-0">
				In wenigen Schritten zu den passenden Funktionen und sofort nutzbaren Vorlagen.
			</p>
		</template>

		<template #default>
			<!-- Fortschritts-Anzeige -->
			<div class="d-flex flex-wrap align-center mt-6 mb-8" data-testid="onboarding-steps">
				<template v-for="(label, index) in stepLabels" :key="index">
					<div class="d-flex align-center">
						<VAvatar
							:color="index <= step ? 'primary' : 'surface-variant'"
							size="32"
							:variant="index <= step ? 'flat' : 'tonal'"
						>
							<VIcon v-if="index < step" :icon="mdiCheck" size="18" />
							<span v-else>{{ index + 1 }}</span>
						</VAvatar>
						<span class="ml-2 mr-4 text-body-2" :class="{ 'font-weight-bold': index === step }">
							{{ label }}
						</span>
					</div>
					<VDivider v-if="index < stepLabels.length - 1" class="mr-4" style="min-width: 16px; max-width: 32px" />
				</template>
			</div>

			<!-- Schritt 1: Lehrkrafttyp -->
			<section v-if="step === 0" data-testid="step-teacher-type">
				<h2 class="text-h5 mb-1">Welcher Lehrkrafttyp beschreibt Sie am besten?</h2>
				<p class="text-medium-emphasis mb-5">Daraus leiten wir Ihre wichtigsten Funktionen ab.</p>
				<VRow>
					<VCol v-for="opt in teacherTypeOptions" :key="opt.value" cols="12" sm="6">
						<VCard
							:variant="answers.teacherType === opt.value ? 'flat' : 'outlined'"
							:color="answers.teacherType === opt.value ? 'primary' : undefined"
							class="h-100"
							:data-testid="`teacher-type-${opt.value}`"
							@click="answers.teacherType = opt.value"
						>
							<VCardText class="d-flex align-center">
								<VIcon :icon="opt.icon" size="36" class="mr-4" />
								<div>
									<div class="text-subtitle-1 font-weight-bold">{{ opt.title }}</div>
									<div class="text-body-2" :class="answers.teacherType === opt.value ? '' : 'text-medium-emphasis'">
										{{ opt.subtitle }}
									</div>
								</div>
							</VCardText>
						</VCard>
					</VCol>
				</VRow>
			</section>

			<!-- Schritt 2: Eigenschaften -->
			<section v-else-if="step === 1" data-testid="step-properties">
				<h2 class="text-h5 mb-5">Erzählen Sie uns mehr über Ihren Kontext</h2>

				<VSelect
					v-model="answers.schoolForm"
					:items="schoolFormOptions"
					item-title="title"
					item-value="value"
					label="Schulform"
					variant="outlined"
					clearable
					data-testid="school-form-select"
					class="mb-4"
				/>

				<div class="text-subtitle-1 font-weight-bold mb-2">Wie erfahren sind Sie mit digitalen Werkzeugen?</div>
				<VRow class="mb-2">
					<VCol v-for="opt in experienceOptions" :key="opt.value" cols="12" sm="4">
						<VCard
							:variant="answers.experience === opt.value ? 'flat' : 'outlined'"
							:color="answers.experience === opt.value ? 'primary' : undefined"
							:data-testid="`experience-${opt.value}`"
							@click="answers.experience = opt.value"
						>
							<VCardText>
								<div class="font-weight-bold">{{ opt.title }}</div>
								<div class="text-body-2" :class="answers.experience === opt.value ? '' : 'text-medium-emphasis'">
									{{ opt.subtitle }}
								</div>
							</VCardText>
						</VCard>
					</VCol>
				</VRow>

				<div class="text-subtitle-1 font-weight-bold mb-2 mt-4">Worauf liegt Ihr Schwerpunkt? (Mehrfachauswahl)</div>
				<div class="d-flex flex-wrap ga-2">
					<VChip
						v-for="opt in focusAreaOptions"
						:key="opt.value"
						:prepend-icon="opt.icon"
						:color="answers.focusAreas.includes(opt.value) ? 'primary' : undefined"
						:variant="answers.focusAreas.includes(opt.value) ? 'flat' : 'outlined'"
						:data-testid="`focus-${opt.value}`"
						filter
						:filter-icon="mdiCheck"
						@click="toggleFocus(opt.value)"
					>
						{{ opt.title }}
					</VChip>
				</div>
			</section>

			<!-- Schritt 3: Empfohlene Funktionen -->
			<section v-else-if="step === 2" data-testid="step-suggestions">
				<h2 class="text-h5 mb-1">Ihre empfohlenen Funktionen</h2>
				<p class="text-medium-emphasis mb-5">Auf Basis Ihrer Angaben passend sortiert – die wichtigsten zuerst.</p>
				<VCard
					v-for="(feature, idx) in topSuggestions"
					:key="feature.id"
					variant="outlined"
					class="mb-3"
					:data-testid="`suggestion-${feature.id}`"
				>
					<VCardText class="d-flex align-start">
						<VAvatar :color="idx === 0 ? 'primary' : 'surface-variant'" size="44" class="mr-4">
							<VIcon :icon="feature.icon" />
						</VAvatar>
						<div class="flex-grow-1">
							<div class="d-flex align-center justify-space-between flex-wrap">
								<span class="text-subtitle-1 font-weight-bold">{{ feature.title }}</span>
								<VChip v-if="idx === 0" color="primary" size="small" label class="ml-2">Top-Empfehlung</VChip>
							</div>
							<VProgressLinear
								:model-value="(feature.score / maxScore) * 100"
								color="primary"
								height="6"
								rounded
								class="my-2"
							/>
							<ul class="reasons pl-4 mb-0">
								<li v-for="(reason, ri) in feature.reasons" :key="ri" class="text-body-2 text-medium-emphasis">
									{{ reason }}
								</li>
							</ul>
						</div>
						<VBtn
							:append-icon="mdiArrowRight"
							:href="feature.to"
							variant="text"
							color="primary"
							class="ml-2 flex-shrink-0"
							:data-testid="`open-${feature.id}`"
						>
							Öffnen
						</VBtn>
					</VCardText>
				</VCard>
			</section>

			<!-- Schritt 4: Vorlagen -->
			<section v-else-if="step === 3" data-testid="step-templates">
				<h2 class="text-h5 mb-1">Sofort nutzbare Vorlagen</h2>
				<p class="text-medium-emphasis mb-5">Für Ihren Lehrkrafttyp und Ihre Schwerpunkte zusammengestellt.</p>
				<VRow>
					<VCol v-for="tpl in templates" :key="tpl.id" cols="12" sm="6">
						<VCard variant="outlined" class="h-100 d-flex flex-column" :data-testid="`template-${tpl.id}`">
							<VCardItem>
								<template #prepend>
									<VAvatar color="surface-variant" size="40"><VIcon :icon="tpl.icon" /></VAvatar>
								</template>
								<VCardTitle class="text-wrap">{{ tpl.title }}</VCardTitle>
								<VCardSubtitle>
									<VChip size="x-small" label class="mr-1">{{ tpl.category }}</VChip>
									<VChip v-if="(tpl.score ?? 0) > 0" size="x-small" color="primary" label>Passend</VChip>
								</VCardSubtitle>
							</VCardItem>
							<VCardText class="flex-grow-1 text-medium-emphasis">{{ tpl.description }}</VCardText>
							<VCardActions>
								<VBtn variant="text" :prepend-icon="mdiEyeOutline" @click="openPreview(tpl)">Vorschau</VBtn>
								<VSpacer />
								<VBtn
									variant="tonal"
									color="primary"
									:prepend-icon="mdiContentCopy"
									:data-testid="`use-${tpl.id}`"
									@click="useTemplate(tpl)"
								>
									Vorlage verwenden
								</VBtn>
							</VCardActions>
						</VCard>
					</VCol>
				</VRow>
			</section>

			<!-- Navigation -->
			<VDivider class="my-6" />
			<div class="d-flex align-center">
				<VBtn v-if="step > 0" variant="text" :prepend-icon="mdiArrowLeft" data-testid="back-btn" @click="back">
					Zurück
				</VBtn>
				<VSpacer />
				<VBtn v-if="step < 3" variant="text" data-testid="restart-btn" @click="reset">Neu starten</VBtn>
				<VBtn
					v-if="step < 3"
					color="primary"
					:append-icon="mdiArrowRight"
					:disabled="!canContinue"
					data-testid="next-btn"
					@click="next"
				>
					{{ step === 1 ? "Empfehlungen anzeigen" : "Weiter" }}
				</VBtn>
				<VBtn
					v-else
					color="primary"
					:prepend-icon="mdiCheck"
					href="/dashboard"
					data-testid="finish-btn"
					@click="complete"
				>
					Fertig – zum Dashboard
				</VBtn>
			</div>

			<!-- Vorschau-Dialog -->
			<VDialog v-model="previewOpen" max-width="720" data-testid="template-preview-dialog">
				<VCard v-if="activeTemplate">
					<VCardItem>
						<VCardTitle>{{ activeTemplate.title }}</VCardTitle>
						<VCardSubtitle>{{ activeTemplate.description }}</VCardSubtitle>
						<template #append>
							<VBtn :icon="mdiClose" variant="text" @click="previewOpen = false" />
						</template>
					</VCardItem>
					<VCardText>
						<pre class="template-content">{{ activeTemplate.content }}</pre>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn color="primary" variant="tonal" :prepend-icon="mdiContentCopy" @click="useTemplate(activeTemplate)">
							Kopieren
						</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>

			<VSnackbar v-model="snackbar" :timeout="3000" color="success" data-testid="onboarding-snackbar">
				{{ snackbarText }}
			</VSnackbar>
		</template>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { type TemplateItem, useOnboardingWizard } from "@/composables/onboarding-wizard.composable";
import { buildPageTitle } from "@/utils/pageTitle";
import { useEnvConfig } from "@data-env";
import {
	mdiArrowLeft,
	mdiArrowRight,
	mdiCheck,
	mdiClose,
	mdiContentCopy,
	mdiEyeOutline,
	mdiLightbulbOnOutline,
} from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";

const {
	step,
	answers,
	topSuggestions,
	maxScore,
	templates,
	canContinue,
	toggleFocus,
	next,
	back,
	complete,
	reset,
	teacherTypeOptions,
	schoolFormOptions,
	experienceOptions,
	focusAreaOptions,
} = useOnboardingWizard();

useTitle(buildPageTitle("Onboarding-Assistent"));

const instanceTitle = computed(() => useEnvConfig().value.SC_TITLE || "Schulcloud");

const stepLabels = ["Lehrkrafttyp", "Eigenschaften", "Funktionen", "Vorlagen"];

const previewOpen = ref(false);
const activeTemplate = ref<TemplateItem | null>(null);
const snackbar = ref(false);
const snackbarText = ref("");

const openPreview = (tpl: TemplateItem) => {
	activeTemplate.value = tpl;
	previewOpen.value = true;
};

const useTemplate = async (tpl: TemplateItem) => {
	try {
		await navigator.clipboard.writeText(tpl.content);
		snackbarText.value = `Vorlage „${tpl.title}“ in die Zwischenablage kopiert.`;
	} catch {
		snackbarText.value = `Vorlage „${tpl.title}“ ausgewählt.`;
	}
	snackbar.value = true;
	previewOpen.value = false;
};
</script>

<style lang="scss" scoped>
.reasons li {
	list-style: disc;
}
.template-content {
	white-space: pre-wrap;
	font-family: var(--v-font-family-monospace, monospace);
	font-size: 0.85rem;
	background: rgba(var(--v-theme-on-surface), 0.04);
	padding: 16px;
	border-radius: 8px;
	max-height: 50vh;
	overflow: auto;
}
</style>
