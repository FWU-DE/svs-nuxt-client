<template>
	<div
		v-if="others.length > 0"
		class="d-flex align-center board-presence"
		role="group"
		:aria-label="groupLabel"
		data-testid="board-presence"
	>
		<VTooltip v-for="editor in visible" :key="editor.id" location="bottom" :text="fullName(editor)">
			<template #activator="{ props: tooltipProps }">
				<VAvatar
					v-bind="tooltipProps"
					size="32"
					class="bg-surface-variant board-presence-avatar"
					:data-testid="`board-presence-user-${editor.id}`"
				>
					<span class="text-caption font-weight-bold">{{ initials(editor) }}</span>
				</VAvatar>
			</template>
		</VTooltip>
		<VTooltip v-if="hidden.length > 0" location="bottom" :text="hidden.map(fullName).join(', ')">
			<template #activator="{ props: tooltipProps }">
				<VAvatar
					v-bind="tooltipProps"
					size="32"
					class="bg-surface-variant board-presence-avatar"
					data-testid="board-presence-more"
				>
					<span class="text-caption font-weight-bold">{{
						t("components.board.presence.more", { count: hidden.length })
					}}</span>
				</VAvatar>
			</template>
		</VTooltip>
	</div>
</template>

<script setup lang="ts">
import { useAppStoreRefs } from "@data-app";
import { type BoardPresenceUser, useBoardPresenceStore } from "@data-board";
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ boardId: string }>();

const MAX_VISIBLE = 4;

const { t } = useI18n();
const presenceStore = useBoardPresenceStore();
const { user } = useAppStoreRefs();

// The viewer knows they are here; the group shows the others who can edit.
const others = computed(() => presenceStore.editorsOf(props.boardId).filter((u) => u.id !== user.value?.id));
const visible = computed(() =>
	others.value.length > MAX_VISIBLE ? others.value.slice(0, MAX_VISIBLE - 1) : others.value
);
const hidden = computed(() => others.value.slice(visible.value.length));

const fullName = (u: BoardPresenceUser) => `${u.firstName} ${u.lastName}`.trim();
const initials = (u: BoardPresenceUser) => `${u.firstName.slice(0, 1)}${u.lastName.slice(0, 1)}`.toUpperCase();

const groupLabel = computed(() =>
	t("components.board.presence.label", { names: others.value.map(fullName).join(", ") })
);

// The board may have been loaded before this store listened; ask once it is here.
watch(
	() => props.boardId,
	(boardId) => {
		if (boardId) presenceStore.fetchPresence(boardId);
	},
	{ immediate: true }
);
</script>

<style scoped>
.board-presence-avatar + .board-presence-avatar,
.board-presence > * + * {
	margin-left: -6px;
	border: 2px solid rgb(var(--v-theme-surface));
}
</style>
