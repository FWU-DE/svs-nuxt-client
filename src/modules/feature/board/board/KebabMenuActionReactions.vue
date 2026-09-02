<template>
	<KebabMenuAction :icon="mdiHeartOutline" data-testid="board-menu-action-reactions">
		{{ $t("components.board.action.interactions") }}
	</KebabMenuAction>
</template>

<script setup lang="ts">
import { mdiHeartOutline } from "@icons/material";
import { KebabMenuAction } from "@ui-kebab-menu";
</script>
