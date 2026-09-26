import LegacyAccordion from "./LegacyAccordion.vue";
import { mount } from "@vue/test-utils";

describe("LegacyAccordion", () => {
	const items = [
		{ key: "a", title: "Version 2026.8.0", aside: "Sa., 1. Aug. 2026" },
		{ key: "b", title: "Version 2026.7.0", aside: "Sa., 4. Juli 2026" },
	];

	const setup = () =>
		mount(LegacyAccordion, {
			props: { items, testId: "acc" },
			slots: { default: `<template #default="{ item }"><p class="body">{{ item.title }} body</p></template>` },
		});

	it("opens the first card initially, like the legacy accordion", () => {
		const wrapper = setup();
		const bodies = wrapper.findAll(".legacy-accordion__body");

		expect(bodies[0].isVisible()).toBe(true);
		expect(bodies[1].attributes("style")).toContain("display: none");
		expect(wrapper.text()).toContain("Sa., 1. Aug. 2026");
	});

	it("keeps one card open at a time", async () => {
		const wrapper = setup();
		await wrapper.get("[data-testid='acc-toggle-1']").trigger("click");
		const bodies = wrapper.findAll(".legacy-accordion__body");

		expect(bodies[0].attributes("style")).toContain("display: none");
		expect(bodies[1].attributes("style") ?? "").not.toContain("display: none");
	});
});
