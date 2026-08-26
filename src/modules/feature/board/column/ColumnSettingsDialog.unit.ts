import ColumnSettingsDialog from "./ColumnSettingsDialog.vue";
import de from "@/locales/de";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { CardReactionType } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

/**
 * The tri-state is the part that can go wrong: "follows the board" has to stay distinguishable
 * from "off here", and choosing it has to travel as null rather than as a string.
 */
const setup = (props: { commentsEnabled?: boolean | null; reactionType?: CardReactionType | null } = {}) => {
	// SvsDialog resolves its title through the global i18n instance, which needs a store.
	setActivePinia(createTestingPinia());

	return mount(ColumnSettingsDialog, {
		global: {
			plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
		},
		props: { modelValue: true, ...props },
	});
};

const selectFor = (wrapper: ReturnType<typeof setup>, testId: string) =>
	wrapper.findComponent(`[data-testid=${testId}]`);

describe("ColumnSettingsDialog", () => {
	describe("when the column follows the board", () => {
		it("should preselect the inherit option for comments", () => {
			const wrapper = setup({ commentsEnabled: null });

			expect(selectFor(wrapper, "column-settings-comments").props("modelValue")).toBe("null");
		});

		it("should preselect the inherit option for reactions", () => {
			const wrapper = setup({ reactionType: null });

			expect(selectFor(wrapper, "column-settings-reactions").props("modelValue")).toBe("null");
		});
	});

	describe("when the column has its own setting", () => {
		it("should preselect the column's comment setting", () => {
			const wrapper = setup({ commentsEnabled: false });

			expect(selectFor(wrapper, "column-settings-comments").props("modelValue")).toBe("false");
		});

		it("should preselect the column's reaction kind", () => {
			const wrapper = setup({ reactionType: CardReactionType.STAR });

			expect(selectFor(wrapper, "column-settings-reactions").props("modelValue")).toBe(CardReactionType.STAR);
		});
	});

	describe("when a comment setting is chosen", () => {
		it("should report true as a boolean, not as a string", async () => {
			const wrapper = setup();

			selectFor(wrapper, "column-settings-comments").vm.$emit("update:modelValue", "true");
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted("change-comments")?.at(-1)).toEqual([true]);
		});

		it("should report off as false", async () => {
			const wrapper = setup();

			selectFor(wrapper, "column-settings-comments").vm.$emit("update:modelValue", "false");
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted("change-comments")?.at(-1)).toEqual([false]);
		});

		it("should report inherit as null, so the column goes back under the board", async () => {
			const wrapper = setup({ commentsEnabled: true });

			selectFor(wrapper, "column-settings-comments").vm.$emit("update:modelValue", "null");
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted("change-comments")?.at(-1)).toEqual([null]);
		});
	});

	describe("when a reaction kind is chosen", () => {
		it("should report the chosen kind", async () => {
			const wrapper = setup();

			selectFor(wrapper, "column-settings-reactions").vm.$emit("update:modelValue", CardReactionType.VOTE);
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted("change-reactions")?.at(-1)).toEqual([CardReactionType.VOTE]);
		});

		it("should keep 'none' distinct from inherit", async () => {
			const wrapper = setup();

			selectFor(wrapper, "column-settings-reactions").vm.$emit("update:modelValue", CardReactionType.NONE);
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted("change-reactions")?.at(-1)).toEqual([CardReactionType.NONE]);
		});

		it("should report inherit as null", async () => {
			const wrapper = setup({ reactionType: CardReactionType.LIKE });

			selectFor(wrapper, "column-settings-reactions").vm.$emit("update:modelValue", "null");
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted("change-reactions")?.at(-1)).toEqual([null]);
		});
	});
});
