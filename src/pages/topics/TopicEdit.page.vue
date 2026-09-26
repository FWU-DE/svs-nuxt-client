<template>
	<DefaultWireframe max-width="short" :breadcrumbs="breadcrumbs" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="topic-edit-title">
				{{ isNew ? t("legacy.topic._topic.headline.createTopic") : t("legacy.global.button.editTopic") }}
			</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VForm ref="form" data-testid="topic-edit-form" @submit.prevent="save">
				<VTextField
					v-model="name"
					:label="t('legacy.topic._topic.label.titleOfTheTopic')"
					:placeholder="t('legacy.topic._topic.input.countWithPrimeNumbers')"
					:rules="[required]"
					data-testid="topic-name"
					class="mb-2"
				/>

				<p class="font-weight-bold mb-2">{{ t("legacy.topic._topic.label.content") }}</p>
				<VCard
					v-for="(block, index) in blocks"
					:key="block.key"
					variant="outlined"
					class="mb-4"
					:class="{ 'block-hidden': block.hidden }"
					data-testid="topic-block"
				>
					<VCardText>
						<div class="d-flex align-center ga-1 mb-2">
							<VTextField
								v-model="block.title"
								:placeholder="t('legacy.topic.topicEdit.input.sectionTitle')"
								:aria-label="t('legacy.topic.topicEdit.input.sectionTitle')"
								density="compact"
								hide-details
								data-testid="topic-block-title"
							/>
							<VBtn
								icon
								variant="text"
								size="small"
								:disabled="index === 0"
								:aria-label="t('pages.topicEdit.moveUp')"
								data-testid="topic-block-up"
								@click="move(index, -1)"
							>
								<VIcon :icon="mdiArrowUp" />
							</VBtn>
							<VBtn
								icon
								variant="text"
								size="small"
								:disabled="index === blocks.length - 1"
								:aria-label="t('pages.topicEdit.moveDown')"
								data-testid="topic-block-down"
								@click="move(index, 1)"
							>
								<VIcon :icon="mdiArrowDown" />
							</VBtn>
							<VBtn
								icon
								variant="text"
								size="small"
								:aria-label="
									block.hidden
										? t('legacy.topic.topicEdit.label.openSection')
										: t('legacy.topic.topicEdit.label.lockSection')
								"
								:title="
									block.hidden
										? t('legacy.topic.topicEdit.label.openSection')
										: t('legacy.topic.topicEdit.label.lockSection')
								"
								data-testid="topic-block-hidden"
								@click="block.hidden = !block.hidden"
							>
								<VIcon :icon="block.hidden ? mdiEyeOffOutline : mdiEyeOutline" />
							</VBtn>
							<VBtn
								icon
								variant="text"
								size="small"
								:aria-label="t('legacy.global.headline.delete')"
								data-testid="topic-block-delete"
								@click="blocks.splice(index, 1)"
							>
								<VIcon :icon="mdiTrashCanOutline" />
							</VBtn>
						</div>

						<ClassicEditor v-if="block.component === 'text'" v-model="block.text" data-testid="topic-block-text" />
						<template v-else-if="block.component === 'geoGebra'">
							<VTextField
								v-model="block.materialId"
								:label="t('legacy.topic.topicEdit.aria_label.geoGebraID')"
								:placeholder="t('legacy.topic.topicEdit.input.GeoGebraEnterId')"
								:hint="t('legacy.topic.topicEdit.label.youllFindTheIdOn')"
								persistent-hint
								data-testid="topic-block-geogebra"
							/>
						</template>
						<template v-else-if="block.component === 'internal'">
							<VTextField
								v-model="block.url"
								:label="t('legacy.topic.topicEdit.label.internalLink')"
								:placeholder="`${origin}/homework/…`"
								:hint="t('legacy.topic.topicEdit.label.theLinkHasToBeginWith', { baseUrl: origin })"
								persistent-hint
								data-testid="topic-block-internal"
							/>
						</template>
						<p v-else class="text-medium-emphasis mb-0" data-testid="topic-block-kept">
							{{ t("pages.topicEdit.keptBlock", { component: block.component }) }}
						</p>
					</VCardText>
				</VCard>

				<div
					class="d-flex flex-wrap ga-2"
					role="group"
					:aria-label="t('legacy.topic.topicEdit.aria_label.chooseContent')"
				>
					<VBtn variant="outlined" data-testid="topic-addcontent-text-btn" @click="add('text')">
						+ {{ t("legacy.topic.topicEdit.button.text") }}
					</VBtn>
					<VBtn variant="outlined" data-testid="topic-addcontent-geogebra-btn" @click="add('geoGebra')">
						+ {{ t("legacy.topic.topicEdit.button.geoGebraWorksheet") }}
					</VBtn>
					<VBtn variant="outlined" data-testid="topic-addcontent-task-btn" @click="add('internal')">
						+ {{ t("legacy.global.headline.task") }}
					</VBtn>
				</div>

				<div class="d-flex justify-end ga-2 mt-6">
					<VBtn variant="text" data-testid="topic-discardchanges-btn" @click="leave()">
						{{ t("legacy.global.button.discard") }}
					</VBtn>
					<VBtn type="submit" color="primary" variant="flat" :loading="saving" data-testid="topic-submitchanges-btn">
						{{ isNew ? t("legacy.global.button.create") : t("legacy.global.button.save") }}
					</VBtn>
				</div>
			</VForm>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
// Create or edit a topic (legacy views/topic/edit-topic.hbs and its React block editor): text,
// GeoGebra and task blocks can be added, moved, locked and removed. Blocks of other kinds
// (Lern-Store resources, Etherpads) stay as they are; both are switched off here.
import { serverMessage } from "@/components/homework/serverMessage";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { LessonContent, useLegacyCourseApi } from "@/composables/legacy-course.api";
import { buildPageTitle } from "@/utils/pageTitle";
import { notifyError, notifySuccess } from "@data-app";
import { ClassicEditor } from "@feature-editor";
import { mdiArrowDown, mdiArrowUp, mdiEyeOffOutline, mdiEyeOutline, mdiTrashCanOutline } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { Breadcrumb, DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

type Block = {
	key: number;
	component: string;
	title: string;
	hidden: boolean;
	text: string;
	materialId: string;
	url: string;
	/** Content of blocks this editor does not handle, written back unchanged. */
	original?: Record<string, unknown>;
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useLegacyCourseApi();

const courseId = computed(() => String(route.params.courseId));
const topicId = computed(() => (route.params.topicId ? String(route.params.topicId) : undefined));
const courseGroupId = computed(() =>
	typeof route.query.courseGroup === "string" ? route.query.courseGroup : undefined
);
const isNew = computed(() => !topicId.value);
const origin = window.location.origin;

const name = ref("");
const blocks = ref<Block[]>([]);
const courseName = ref("");
const saving = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>();
let nextKey = 0;

const required = (value: string) => !!value?.trim() || t("pages.legacyPages.required");

const toBlock = (content: LessonContent): Block => ({
	key: nextKey++,
	component: content.component,
	title: content.title ?? "",
	hidden: !!content.hidden,
	text: String(content.content?.text ?? ""),
	materialId: String(content.content?.materialId ?? ""),
	url: String(content.content?.url ?? ""),
	original: content.content,
});

const add = (component: string) => {
	blocks.value.push(toBlock({ component, content: {} }));
};

const move = (index: number, by: number) => {
	const [block] = blocks.value.splice(index, 1);
	blocks.value.splice(index + by, 0, block);
};

const toContent = (block: Block): LessonContent => {
	let content: Record<string, unknown> | undefined;
	switch (block.component) {
		case "text":
			content = { text: block.text };
			break;
		case "geoGebra":
			content = { materialId: block.materialId.trim() };
			break;
		case "internal":
			// As the legacy client: a link that does not point into this installation is replaced by its start page.
			content = { url: block.url.trim().startsWith(origin) ? block.url.trim() : origin };
			break;
		default:
			content = block.original;
	}
	return { component: block.component, title: block.title, hidden: block.hidden, content };
};

const { loadingState } = useSafeAxiosRunner(async () => {
	const course = await api.getCourse(courseId.value);
	courseName.value = course.name;
	if (topicId.value) {
		const lesson = await api.getLesson(topicId.value);
		name.value = lesson.name;
		blocks.value = lesson.contents.map(toBlock);
	}
	return course;
});

const breadcrumbs = computed<Breadcrumb[]>(() => [
	{ title: t("common.words.courses"), to: "/rooms/courses-overview" },
	{ title: courseName.value, to: `/rooms/${courseId.value}` },
]);

const groupQuery = computed(() => (courseGroupId.value ? `?courseGroup=${courseGroupId.value}` : ""));

const leave = (id?: string) => {
	const returnUrl = typeof route.query.returnUrl === "string" ? route.query.returnUrl : undefined;
	if (returnUrl) return router.push(`/${returnUrl.replace(/^\//, "")}`);
	const target = id ?? topicId.value;
	if (target) return router.push(`/courses/${courseId.value}/topics/${target}${groupQuery.value}`);
	if (courseGroupId.value) return router.push(`/courses/${courseId.value}/groups/${courseGroupId.value}`);
	return router.push(`/rooms/${courseId.value}`);
};

const save = async () => {
	if (!(await form.value?.validate())?.valid) return;
	const contents = blocks.value.map(toContent);
	const parent = courseGroupId.value ? { courseGroupId: courseGroupId.value } : { courseId: courseId.value };
	saving.value = true;
	try {
		const saved = topicId.value
			? await api.updateLesson(topicId.value, { name: name.value.trim(), contents, ...parent })
			: await api.createLesson({ name: name.value.trim(), contents, ...parent });
		notifySuccess(t("pages.topicEdit.saved"));
		await leave(saved._id);
	} catch (error) {
		notifyError(serverMessage(error) ?? t("pages.legacyPages.error"));
	} finally {
		saving.value = false;
	}
};

useTitle(
	computed(() =>
		buildPageTitle(isNew.value ? t("legacy.topic._topic.headline.createTopic") : t("legacy.global.button.editTopic"))
	)
);
</script>

<style lang="scss" scoped>
.block-hidden {
	opacity: 0.6;
}
</style>
