<template>
	<SvsDialog
		v-model="isOpen"
		title="pages.nostrSearch.board.title"
		is-open-state-managed-externally
		:is-loading="isSubmitting"
		:confirm-btn-disabled="!selectedBoardId"
		confirm-btn-lang-key="pages.nostrSearch.board.confirm"
		max-width="520"
		data-testid="nostr-board-dialog"
		@confirm="submit"
		@cancel="isOpen = false"
	>
		<template #content>
			<p class="text-body-2 text-medium-emphasis" data-testid="nostr-board-subject">
				{{ t("pages.nostrSearch.board.description", { title: subject }) }}
			</p>

			<VAlert v-if="errorKey" type="error" variant="tonal" class="mb-4" data-testid="nostr-board-error">
				{{ t(errorKey) }}
			</VAlert>

			<VSelect
				v-model="selectedRoomId"
				:items="roomItems"
				:label="t('pages.nostrSearch.board.room')"
				:loading="isLoading"
				variant="outlined"
				density="comfortable"
				data-testid="nostr-board-room"
			/>

			<VSelect
				v-model="selectedBoardId"
				:items="boardItems"
				:label="t('pages.nostrSearch.board.board')"
				:loading="isLoading"
				:disabled="!selectedRoomId || boardItems.length === 0"
				:hint="!isLoading && selectedRoomId && boardItems.length === 0 ? t('pages.nostrSearch.board.empty') : ''"
				persistent-hint
				variant="outlined"
				density="comfortable"
				data-testid="nostr-board-board"
			/>
		</template>
	</SvsDialog>
</template>

<script setup lang="ts">
import { useNostrBoardExport } from "./boardExport.composable";
import { NostrSearchResult } from "./types";
import { SvsDialog } from "@ui-dialog";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ result: NostrSearchResult | null }>();
const emit = defineEmits<{ added: [boardId: string] }>();

const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { rooms, boards, isLoading, isSubmitting, errorKey, loadRooms, loadBoards, addToBoard } = useNostrBoardExport();

const selectedRoomId = ref<string | undefined>(undefined);
const selectedBoardId = ref<string | undefined>(undefined);

const roomItems = computed(() => rooms.value.map((room) => ({ title: room.name, value: room.id })));
const boardItems = computed(() => boards.value.map((board) => ({ title: board.title, value: board.id })));

const subject = computed(() => props.result?.title ?? props.result?.content.slice(0, 60) ?? "");

watch(isOpen, (opened) => {
	if (!opened) return;
	selectedRoomId.value = undefined;
	selectedBoardId.value = undefined;
	loadRooms();
});

// One board per room, usually — picking the room is the real choice, so preselect what follows.
watch(selectedRoomId, async (roomId) => {
	selectedBoardId.value = undefined;
	if (!roomId) return;
	await loadBoards(roomId);
	if (boards.value.length === 1) selectedBoardId.value = boards.value[0].id;
});

const submit = async () => {
	if (!props.result || !selectedBoardId.value) return;

	const succeeded = await addToBoard(props.result, selectedBoardId.value, {
		source: t("pages.nostrSearch.board.label.source"),
		license: t("pages.nostrSearch.board.label.license"),
		via: t("pages.nostrSearch.board.label.via"),
		fallbackTitle: t("pages.nostrSearch.board.label.fallbackTitle"),
	});

	if (!succeeded) return;

	emit("added", selectedBoardId.value);
	isOpen.value = false;
};
</script>
