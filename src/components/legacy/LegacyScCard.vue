<template>
	<component :is="to ? RouterLink : href ? 'a' : 'article'" v-bind="linkProps" class="sc-card" :data-testid="testId">
		<div class="sc-card-header" :style="background ? { background } : undefined">
			<span class="sc-card-title">
				<span class="title" data-testid="sc-card-title">
					<VIcon v-if="icon" :icon="icon" size="small" class="mr-1" />{{ title }}
				</span>
				<small v-if="secondaryTitle" class="d-block" data-testid="sc-card-secondary-title">{{ secondaryTitle }}</small>
			</span>
		</div>
		<div class="sc-card-body">
			<div class="sc-card-content"><slot /></div>
			<div v-if="linkText" class="sc-card-footer" data-testid="sc-card-link">{{ linkText }}</div>
		</div>
	</component>
</template>

<script setup lang="ts">
// The `sc-card` of the legacy client (views/lib/components/sc-card.hbs): coloured title
// block, text and a link label at the bottom right; the whole card is the link.
// Used where native pages replace legacy views.
import { computed } from "vue";
import { RouteLocationRaw, RouterLink } from "vue-router";

const props = defineProps<{
	title: string;
	secondaryTitle?: string;
	icon?: string;
	href?: string;
	to?: RouteLocationRaw;
	linkText?: string;
	background?: string;
	testId?: string;
}>();

const linkProps = computed(() => (props.to ? { to: props.to } : props.href ? { href: props.href } : {}));
</script>

<style lang="scss" scoped>
.sc-card {
	display: flex;
	flex-direction: column;
	height: 100%;
	border-radius: 2px;
	overflow: hidden;
	color: inherit;
	text-decoration: none;
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.12),
		0 1px 2px rgba(0, 0, 0, 0.24);
	transition: box-shadow 0.3s;

	&:hover {
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.16),
			0 3px 6px rgba(0, 0, 0, 0.23);
	}
}

.sc-card-header {
	display: flex;
	min-height: 6rem;
	padding: 1rem 1rem 0.5rem;
	color: #fff;
	background: rgb(var(--v-theme-on-surface));
}

.sc-card-title {
	word-break: break-word;

	.title {
		font-size: 1.6rem;
		line-height: 1.3;
	}

	small {
		font-size: 0.9rem;
		margin: 0.75rem 0 0.5rem;
	}
}

.sc-card-body {
	display: flex;
	flex: 1;
	flex-direction: column;
	padding: 0.5rem 0.75rem;
	background: rgb(var(--v-theme-surface));
}

.sc-card-content {
	flex: 1;
}

.sc-card-footer {
	text-align: right;
	padding-top: 0.5rem;
	font-size: 0.9rem;
}
</style>
