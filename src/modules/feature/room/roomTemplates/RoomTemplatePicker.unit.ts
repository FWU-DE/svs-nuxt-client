import RoomTemplatePicker from "./RoomTemplatePicker.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { roomTemplates } from "@data-room";

describe("@feature-room/RoomTemplatePicker", () => {
	const setup = () =>
		mount(RoomTemplatePicker, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

	it("should render a card for every template", () => {
		const wrapper = setup();

		roomTemplates.forEach((template) => {
			expect(wrapper.find(`[data-testid="room-template-${template.id}"]`).exists()).toBe(true);
		});
	});

	it("should emit the selected template on click", async () => {
		const wrapper = setup();

		await wrapper.find(`[data-testid="room-template-subject"]`).trigger("click");

		expect(wrapper.emitted("select")).toEqual([[roomTemplates.find((template) => template.id === "subject")]]);
	});

	it("should emit the selected template when it is activated with the keyboard", async () => {
		const wrapper = setup();

		await wrapper.find(`[data-testid="room-template-blank"]`).trigger("keydown.enter");

		expect(wrapper.emitted("select")).toEqual([[roomTemplates.find((template) => template.id === "blank")]]);
	});
});
