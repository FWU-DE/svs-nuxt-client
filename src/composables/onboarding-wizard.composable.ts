/**
 * Onboarding-Assistent (POC)
 *
 * Regelbasierte Empfehlungs-Engine: anhand von Lehrkrafttyp und weiteren
 * Eigenschaften (Schulform, digitale Erfahrung, Schwerpunkte) werden passende
 * Funktionen der Schulcloud-Verbund-Software vorgeschlagen und sofort nutzbare
 * Vorlagen (Templates) bereitgestellt.
 *
 * Die Engine ist bewusst frontend-only und ohne Backend-Abhängigkeit gehalten,
 * damit der POC unabhängig vom Serverzustand demonstrierbar ist.
 */
import { useAppStore } from "@data-app";
import {
	mdiAccountGroupOutline,
	mdiAccountMultipleOutline,
	mdiAccountSchoolOutline,
	mdiAccountSupervisorCircleOutline,
	mdiBookshelf,
	mdiCalendarOutline,
	mdiChatOutline,
	mdiCogOutline,
	mdiEmailOutline,
	mdiFileDocumentOutline,
	mdiFileTreeOutline,
	mdiHumanMaleBoard,
	mdiLightbulbOnOutline,
	mdiPlaylistCheck,
	mdiPresentation,
	mdiPuzzleOutline,
	mdiSchoolOutline,
	mdiViewDashboardOutline,
} from "@icons/material";
import { computed, reactive, ref } from "vue";

/* ------------------------------------------------------------------ Typen */

export type TeacherType =
	| "class-teacher"
	| "subject-teacher"
	| "special-needs"
	| "school-lead"
	| "substitute"
	| "trainee";

export type SchoolForm = "grundschule" | "sek1" | "sek2" | "berufsschule" | "foerderschule";

export type Experience = "beginner" | "intermediate" | "advanced";

export type FocusArea = "collaboration" | "assessment" | "communication" | "media" | "organization" | "inclusion";

export interface WizardAnswers {
	teacherType: TeacherType | null;
	schoolForm: SchoolForm | null;
	experience: Experience | null;
	focusAreas: FocusArea[];
}

export interface OptionItem<T> {
	value: T;
	title: string;
	subtitle?: string;
	icon?: string;
}

export interface FeatureSuggestion {
	id: string;
	title: string;
	description: string;
	icon: string;
	to: string;
	score: number;
	reasons: string[];
}

export interface TemplateItem {
	id: string;
	title: string;
	description: string;
	category: string;
	icon: string;
	targetFeature: string;
	tags: Array<TeacherType | FocusArea>;
	content: string;
	score?: number;
}

/* ------------------------------------------------------- Auswahl-Optionen */

export const teacherTypeOptions: OptionItem<TeacherType>[] = [
	{
		value: "class-teacher",
		title: "Klassenlehrkraft",
		subtitle: "Verantwortung für eine Klasse, Organisation & Elternarbeit",
		icon: mdiAccountSupervisorCircleOutline,
	},
	{
		value: "subject-teacher",
		title: "Fachlehrkraft",
		subtitle: "Unterricht in einem oder mehreren Fächern",
		icon: mdiHumanMaleBoard,
	},
	{
		value: "special-needs",
		title: "Förderlehrkraft",
		subtitle: "Sonderpädagogik, Inklusion & individuelle Förderung",
		icon: mdiAccountSchoolOutline,
	},
	{
		value: "school-lead",
		title: "Schulleitung / Administration",
		subtitle: "Schulorganisation, Verwaltung & Steuerung",
		icon: mdiCogOutline,
	},
	{
		value: "substitute",
		title: "Vertretungslehrkraft",
		subtitle: "Flexibler Einsatz in wechselnden Lerngruppen",
		icon: mdiAccountMultipleOutline,
	},
	{
		value: "trainee",
		title: "Referendar:in / Lehramtsanwärter:in",
		subtitle: "Ausbildung, Unterrichtsentwürfe & Dokumentation",
		icon: mdiSchoolOutline,
	},
];

export const schoolFormOptions: OptionItem<SchoolForm>[] = [
	{ value: "grundschule", title: "Grundschule" },
	{ value: "sek1", title: "Sekundarstufe I" },
	{ value: "sek2", title: "Sekundarstufe II / Gymnasium" },
	{ value: "berufsschule", title: "Berufliche Schule" },
	{ value: "foerderschule", title: "Förderschule" },
];

export const experienceOptions: OptionItem<Experience>[] = [
	{ value: "beginner", title: "Einsteiger:in", subtitle: "Erste Schritte mit der Schulcloud" },
	{ value: "intermediate", title: "Fortgeschritten", subtitle: "Grundfunktionen sind vertraut" },
	{ value: "advanced", title: "Profi", subtitle: "Nutzt regelmäßig digitale Werkzeuge" },
];

export const focusAreaOptions: OptionItem<FocusArea>[] = [
	{ value: "collaboration", title: "Zusammenarbeit", icon: mdiAccountGroupOutline },
	{ value: "assessment", title: "Aufgaben & Bewertung", icon: mdiPlaylistCheck },
	{ value: "communication", title: "Kommunikation", icon: mdiChatOutline },
	{ value: "media", title: "Medien & Material", icon: mdiBookshelf },
	{ value: "organization", title: "Organisation", icon: mdiCalendarOutline },
	{ value: "inclusion", title: "Inklusion & Förderung", icon: mdiAccountSchoolOutline },
];

/* --------------------------------------------------------- Funktionskatalog */

interface FeatureDef {
	id: string;
	title: string;
	description: string;
	icon: string;
	to: string;
	/** Grundrelevanz 0-3 */
	base: number;
	byTeacher: Partial<Record<TeacherType, number>>;
	byFocus: Partial<Record<FocusArea, number>>;
	byExperience?: Partial<Record<Experience, number>>;
	bySchoolForm?: Partial<Record<SchoolForm, number>>;
	/** Begründungs-Bausteine */
	reasonByTeacher?: Partial<Record<TeacherType, string>>;
	reasonByFocus?: Partial<Record<FocusArea, string>>;
}

const FEATURES: FeatureDef[] = [
	{
		id: "courses",
		title: "Kurse",
		description: "Strukturierte Lernangebote mit Themen, Materialien und Teilnehmenden.",
		icon: mdiViewDashboardOutline,
		to: "/rooms-overview",
		base: 2,
		byTeacher: { "subject-teacher": 3, "class-teacher": 2, trainee: 2, substitute: 1 },
		byFocus: { media: 1, organization: 1 },
		byExperience: { beginner: 1 },
		reasonByTeacher: {
			"subject-teacher": "Ideal, um Ihren Fachunterricht digital zu strukturieren.",
			"class-teacher": "Bündeln Sie Materialien und Aufgaben für Ihre Klasse an einem Ort.",
		},
	},
	{
		id: "rooms",
		title: "Räume (Lernräume)",
		description: "Gemeinsame Arbeitsbereiche für Klassen, Kollegien oder Projekte.",
		icon: mdiAccountGroupOutline,
		to: "/rooms-overview",
		base: 2,
		byTeacher: { "class-teacher": 3, "school-lead": 2, "special-needs": 2 },
		byFocus: { collaboration: 3, organization: 1 },
		reasonByFocus: {
			collaboration: "Fördert die Zusammenarbeit in festen Lerngruppen.",
		},
	},
	{
		id: "boards",
		title: "Kollaborative Boards",
		description: "Multimediale Tafeln zum gemeinsamen Sammeln, Planen und Präsentieren.",
		icon: mdiPresentation,
		to: "/rooms-overview",
		base: 1,
		byTeacher: { "subject-teacher": 1, "class-teacher": 1, "special-needs": 1 },
		byFocus: { collaboration: 3, media: 2 },
		byExperience: { intermediate: 1, advanced: 2 },
		bySchoolForm: { grundschule: 1, sek1: 1 },
		reasonByFocus: {
			collaboration: "Schüler:innen arbeiten in Echtzeit gemeinsam an einer Tafel.",
			media: "Binden Sie Bilder, Videos und Links direkt ein.",
		},
	},
	{
		id: "tasks",
		title: "Aufgaben",
		description: "Aufgaben verteilen, Abgaben einsammeln und Rückmeldungen geben.",
		icon: mdiPlaylistCheck,
		to: "/tasks",
		base: 2,
		byTeacher: { "subject-teacher": 2, "class-teacher": 2, trainee: 2, substitute: 2 },
		byFocus: { assessment: 3, organization: 1 },
		byExperience: { beginner: 1 },
		reasonByFocus: {
			assessment: "Sammeln Sie Abgaben digital ein und geben Sie Feedback.",
		},
	},
	{
		id: "files",
		title: "Dateiablage",
		description: "Materialien sicher speichern und mit Lerngruppen teilen.",
		icon: mdiFileTreeOutline,
		to: "/files/my",
		base: 2,
		byTeacher: { "subject-teacher": 1, "school-lead": 1, substitute: 1 },
		byFocus: { media: 2, organization: 2 },
		byExperience: { beginner: 1 },
	},
	{
		id: "calendar",
		title: "Kalender",
		description: "Termine, Stunden und Fristen im Blick behalten.",
		icon: mdiCalendarOutline,
		to: "/dashboard",
		base: 1,
		byTeacher: { "class-teacher": 2, "school-lead": 2, substitute: 2 },
		byFocus: { organization: 3 },
		reasonByTeacher: {
			substitute: "Behalten Sie wechselnde Einsätze und Stunden im Überblick.",
		},
	},
	{
		id: "videoconference",
		title: "Videokonferenz",
		description: "Direkt aus Kursen und Räumen heraus Videokonferenzen starten.",
		icon: mdiPresentation,
		to: "/rooms-overview",
		base: 1,
		byTeacher: { "subject-teacher": 1, "class-teacher": 1 },
		byFocus: { communication: 2, collaboration: 1 },
		byExperience: { advanced: 1 },
	},
	{
		id: "messenger",
		title: "Messenger",
		description: "Sichere Kommunikation mit Klassen, Kollegium und Gruppen.",
		icon: mdiChatOutline,
		to: "/messenger",
		base: 1,
		byTeacher: { "class-teacher": 2, "school-lead": 1 },
		byFocus: { communication: 3 },
		reasonByFocus: {
			communication: "Schneller, datenschutzkonformer Austausch mit Ihren Lerngruppen.",
		},
	},
	{
		id: "media-shelf",
		title: "Mediathek / Lern-Store",
		description: "Geprüfte Lerninhalte und interaktive H5P-Materialien nutzen.",
		icon: mdiBookshelf,
		to: "/media-shelf",
		base: 1,
		byTeacher: { "subject-teacher": 2, "special-needs": 2, trainee: 1 },
		byFocus: { media: 3 },
		bySchoolForm: { grundschule: 1, berufsschule: 1 },
		reasonByFocus: {
			media: "Greifen Sie auf kuratierte, lehrplankonforme Inhalte zu.",
		},
	},
	{
		id: "lessons",
		title: "Themen / Unterrichtsstunden",
		description: "Unterricht in Themen gliedern und Materialien zuordnen.",
		icon: mdiFileDocumentOutline,
		to: "/rooms-overview",
		base: 1,
		byTeacher: { "subject-teacher": 2, trainee: 3 },
		byFocus: { media: 1, organization: 1 },
		reasonByTeacher: {
			trainee: "Dokumentieren Sie Unterrichtsentwürfe strukturiert für Ihre Ausbildung.",
		},
	},
];

/* ----------------------------------------------------------- Vorlagenkatalog */

const TEMPLATES: TemplateItem[] = [
	{
		id: "course-skeleton",
		title: "Kurs-Grundgerüst „Mein Fach“",
		description: "Vorstrukturierter Kurs mit Begrüßung, Themenblöcken und Materialordner.",
		category: "Kurs",
		icon: mdiViewDashboardOutline,
		targetFeature: "courses",
		tags: ["subject-teacher", "class-teacher", "media"],
		content: `# Kurs: <Fach> – <Klasse/Jahrgang>

## Willkommen
Kurzer Begrüßungstext, Lernziele und Ablauf des Kurses.

## Themenübersicht
1. Thema 1 – Einstieg
2. Thema 2 – Vertiefung
3. Thema 3 – Anwendung / Projekt

## Material & Downloads
- [ ] Arbeitsblatt 1
- [ ] Präsentation
- [ ] Weiterführende Links

## Organisatorisches
- Bewertungskriterien
- Abgabefristen
- Ansprechpartner:in`,
	},
	{
		id: "weekly-plan",
		title: "Wochenplan-Aufgabe",
		description: "Aufgabenvorlage mit Lernzielen, Teilaufgaben und Abgabe-Checkliste.",
		category: "Aufgabe",
		icon: mdiPlaylistCheck,
		targetFeature: "tasks",
		tags: ["class-teacher", "substitute", "assessment", "organization"],
		content: `# Wochenplan – KW <Nummer>

**Lernziel:** Was sollen die Schüler:innen am Ende können?

## Aufgaben
- [ ] Pflichtaufgabe 1 (ca. 20 Min.)
- [ ] Pflichtaufgabe 2 (ca. 20 Min.)
- [ ] Wahlaufgabe (freiwillig)

## Abgabe
- Format: Dokument / Foto / Audio
- Frist: <Datum>, <Uhrzeit>

## Rückmeldung
Hinweise zur Bewertung und zum Feedback.`,
	},
	{
		id: "parent-letter",
		title: "Elternbrief / Elterninformation",
		description: "Vorlage für eine klare, freundliche Information an Erziehungsberechtigte.",
		category: "Kommunikation",
		icon: mdiEmailOutline,
		targetFeature: "messenger",
		tags: ["class-teacher", "school-lead", "communication"],
		content: `Liebe Eltern und Erziehungsberechtigte,

**Betreff:** <Thema>

hiermit möchte ich Sie über Folgendes informieren:

- Was: <kurze Beschreibung>
- Wann: <Datum / Zeitraum>
- Was wird benötigt: <Materialien / Rückmeldung>

Bei Rückfragen erreichen Sie mich über die Schulcloud.

Mit freundlichen Grüßen
<Name>`,
	},
	{
		id: "collab-board",
		title: "Brainstorming-Board",
		description: "Kollaboratives Board mit Spalten für Ideen, Fragen und Ergebnisse.",
		category: "Board",
		icon: mdiPresentation,
		targetFeature: "boards",
		tags: ["collaboration", "subject-teacher", "media"],
		content: `# Board: <Thema>

| 💡 Ideen | ❓ Fragen | ✅ Ergebnisse |
|----------|-----------|----------------|
|          |           |                |

**Arbeitsauftrag:** Sammelt in Gruppen eure Ideen in der ersten Spalte.
**Zeit:** 15 Minuten
**Präsentation:** je Gruppe 2 Minuten`,
	},
	{
		id: "support-plan",
		title: "Individueller Förderplan",
		description: "Strukturierte Vorlage zur Dokumentation von Förderzielen und Maßnahmen.",
		category: "Förderung",
		icon: mdiAccountSchoolOutline,
		targetFeature: "files",
		tags: ["special-needs", "inclusion", "assessment"],
		content: `# Förderplan – <Name der/des Lernenden>

**Zeitraum:** <von> – <bis>

## Ausgangslage
Kurze Beschreibung der aktuellen Lernsituation.

## Förderziele
1. Ziel 1 (messbar formuliert)
2. Ziel 2

## Maßnahmen
- Maßnahme / Methode
- Differenzierung / Hilfsmittel
- Verantwortlich / Frequenz

## Überprüfung
Wie und wann werden die Ziele überprüft?`,
	},
	{
		id: "substitution-notes",
		title: "Vertretungs-Steckbrief",
		description: "Schnelle Übersicht für den Einstieg in eine fremde Lerngruppe.",
		category: "Organisation",
		icon: mdiCalendarOutline,
		targetFeature: "calendar",
		tags: ["substitute", "organization"],
		content: `# Vertretung: <Klasse> – <Fach> – <Datum>

## Rahmen
- Raum: <Raum>
- Stunde: <Stunde>
- Lernstand / letztes Thema: <Notiz>

## Plan für die Stunde
1. Einstieg (5 Min.)
2. Arbeitsphase (30 Min.)
3. Sicherung (10 Min.)

## Besonderheiten
- Nachteilsausgleich / Hinweise
- Material liegt bereit unter: <Ort>`,
	},
	{
		id: "lesson-draft",
		title: "Unterrichtsentwurf (Referendariat)",
		description: "Gegliederter Stundenentwurf mit Lernzielen und Verlaufsplanung.",
		category: "Unterricht",
		icon: mdiFileDocumentOutline,
		targetFeature: "lessons",
		tags: ["trainee", "assessment", "organization"],
		content: `# Unterrichtsentwurf

**Fach/Thema:** <…>  **Klasse:** <…>  **Datum:** <…>

## Lernziele
- Grobziel:
- Feinziele:

## Verlaufsplanung
| Phase | Zeit | Inhalt | Sozialform | Material |
|-------|------|--------|------------|----------|
| Einstieg |  |  |  |  |
| Erarbeitung |  |  |  |  |
| Sicherung |  |  |  |  |

## Reflexion
Erwartete Schwierigkeiten und Alternativen.`,
	},
	{
		id: "interactive-quiz",
		title: "Interaktives Quiz (H5P)",
		description: "Material aus der Mediathek als Selbstlern-Quiz für Ihre Lerngruppe.",
		category: "Material",
		icon: mdiPuzzleOutline,
		targetFeature: "media-shelf",
		tags: ["media", "subject-teacher", "inclusion"],
		content: `# Quiz: <Thema>

## Fragen
1. <Frage> – Antworttyp: Single Choice
2. <Frage> – Antworttyp: Lückentext
3. <Frage> – Antworttyp: Zuordnung

## Hinweise
- Direktes Feedback nach jeder Frage aktivieren
- Mehrere Versuche erlauben (differenziert)
- In Kurs/Thema einbetten`,
	},
];

/* ---------------------------------------------------- Empfehlungs-Engine */

export function scoreFeatures(answers: WizardAnswers): FeatureSuggestion[] {
	return FEATURES.map((f) => {
		let score = f.base;
		const reasons: string[] = [];

		if (answers.teacherType && f.byTeacher[answers.teacherType]) {
			score += f.byTeacher[answers.teacherType] ?? 0;
			const r = f.reasonByTeacher?.[answers.teacherType];
			if (r) reasons.push(r);
		}
		for (const focus of answers.focusAreas) {
			if (f.byFocus[focus]) {
				score += f.byFocus[focus] ?? 0;
				const r = f.reasonByFocus?.[focus];
				if (r && !reasons.includes(r)) reasons.push(r);
			}
		}
		if (answers.experience && f.byExperience?.[answers.experience]) {
			score += f.byExperience[answers.experience] ?? 0;
		}
		if (answers.schoolForm && f.bySchoolForm?.[answers.schoolForm]) {
			score += f.bySchoolForm[answers.schoolForm] ?? 0;
		}

		if (reasons.length === 0) reasons.push(f.description);

		return { id: f.id, title: f.title, description: f.description, icon: f.icon, to: f.to, score, reasons };
	})
		.filter((f) => f.score > 0)
		.sort((a, b) => b.score - a.score);
}

export function recommendTemplates(answers: WizardAnswers): TemplateItem[] {
	return TEMPLATES.map((tpl) => {
		let score = 0;
		if (answers.teacherType && tpl.tags.includes(answers.teacherType)) score += 3;
		for (const focus of answers.focusAreas) {
			if (tpl.tags.includes(focus)) score += 2;
		}
		return { ...tpl, score };
	}).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Leitet aus der angemeldeten Rolle einen sinnvollen Standard-Lehrkrafttyp ab. */
function defaultTeacherType(): TeacherType | null {
	const store = useAppStore();
	if (store.isAdmin) return "school-lead";
	if (store.isTeacher) return "subject-teacher";
	return null;
}

/* ----------------------------------------------------------- Composable */

export function useOnboardingWizard() {
	const step = ref(0);
	const answers = reactive<WizardAnswers>({
		teacherType: defaultTeacherType(),
		schoolForm: null,
		experience: null,
		focusAreas: [],
	});

	const suggestions = computed(() => scoreFeatures(answers));
	const topSuggestions = computed(() => suggestions.value.slice(0, 6));
	const maxScore = computed(() => suggestions.value[0]?.score ?? 1);
	const templates = computed(() => recommendTemplates(answers));

	const toggleFocus = (focus: FocusArea) => {
		const i = answers.focusAreas.indexOf(focus);
		if (i === -1) answers.focusAreas.push(focus);
		else answers.focusAreas.splice(i, 1);
	};

	const canContinue = computed(() => {
		if (step.value === 0) return answers.teacherType !== null;
		if (step.value === 1) return answers.experience !== null;
		return true;
	});

	const next = () => {
		if (step.value < 3 && canContinue.value) step.value += 1;
	};
	const back = () => {
		if (step.value > 0) step.value -= 1;
	};
	const reset = () => {
		step.value = 0;
		answers.teacherType = defaultTeacherType();
		answers.schoolForm = null;
		answers.experience = null;
		answers.focusAreas = [];
	};

	return {
		step,
		answers,
		suggestions,
		topSuggestions,
		maxScore,
		templates,
		canContinue,
		toggleFocus,
		next,
		back,
		reset,
		// Optionen für die Oberfläche
		teacherTypeOptions,
		schoolFormOptions,
		experienceOptions,
		focusAreaOptions,
	};
}
