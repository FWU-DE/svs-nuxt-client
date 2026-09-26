<template>
	<div class="legacy-accordion" :data-testid="testId">
		<section v-for="(item, index) in items" :key="item.key" class="legacy-accordion__card">
			<h2 class="legacy-accordion__header">
				<button
					type="button"
					class="legacy-accordion__toggle"
					:aria-expanded="open === index"
					:data-testid="`${testId}-toggle-${index}`"
					@click="open = open === index ? -1 : index"
				>
					<span>{{ item.title }}</span>
					<span v-if="item.aside" class="legacy-accordion__aside">{{ item.aside }}</span>
				</button>
			</h2>
			<div v-show="open === index" class="legacy-accordion__body">
				<slot :item="item" :index="index" />
			</div>
		</section>
	</div>
</template>

<script setup lang="ts" generic="T extends { key: string; title: string; aside?: string }">
// Bootstrap accordion of the legacy client (views/system/releases.hbs,
// views/help/accordion-sections.hbs): grey card headers, one card open, the first one initially.
import { ref } from "vue";

defineProps<{
	items: T[];
	testId?: string;
}>();

const open = ref(0);
</script>

<style lang="scss" scoped>
.legacy-accordion__card {
	margin-bottom: 0.5rem;
	border: 1px solid rgba(0, 0, 0, 0.125);
	border-radius: 0.25rem;
}

.legacy-accordion__header {
	margin: 0;
	font-size: 1.25rem;
	font-weight: 400;
	background: #f7f7f9;
	border-bottom: 1px solid rgba(0, 0, 0, 0.125);
}

.legacy-accordion__toggle {
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 0.75rem 1.25rem;
	text-align: left;
	color: inherit;
}

.legacy-accordion__aside {
	opacity: 0.6;
}

.legacy-accordion__body {
	padding: 1.25rem;
}
</style>
