import CardReactionBar from "./CardReactionBar.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import de from "@/locales/de";
import { CardReactionsResponse, CardReactionType } from "@api-server";
import { mount } from "@vue/test-utils";

const setup = (reactions: Partial<CardReactionsResponse> = {}) => {
	const wrapper = mount(CardReactionBar, {
		global: {
			plugins: [
				createTestingVuetify(),
				// Real messages, because the star summary is about the interpolated average.
				createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } }),
			],
		},
		props: {
			reactions: {
				type: CardReactionType.LIKE,
				count: 0,
				sum: 0,
				...reactions,
			},
		},
	});

	return { wrapper };
};

const lastReaction = (wrapper: ReturnType<typeof setup>["wrapper"]) =>
	(wrapper.emitted("react")?.at(-1) as [number | undefined] | undefined)?.[0];

describe("CardReactionBar", () => {
	describe("when the board counts likes", () => {
		it("should show the number of people who reacted", () => {
			const { wrapper } = setup({ count: 3, sum: 3 });

			expect(wrapper.find("[data-testid=card-reaction-summary]").text()).toBe("3");
		});

		it("should send a like on click", async () => {
			const { wrapper } = setup();

			await wrapper.find("[data-testid=card-reaction-like]").trigger("click");

			expect(lastReaction(wrapper)).toBe(1);
		});

		it("should take the like back when clicking it again", async () => {
			const { wrapper } = setup({ count: 1, sum: 1, ownValue: 1 });

			await wrapper.find("[data-testid=card-reaction-like]").trigger("click");

			expect(lastReaction(wrapper)).toBeUndefined();
		});
	});

	describe("when the board collects stars", () => {
		it("should offer five stars", () => {
			const { wrapper } = setup({ type: CardReactionType.STAR });

			expect(wrapper.findAll("[data-testid^=card-reaction-star-]")).toHaveLength(5);
		});

		it("should send the clicked rating", async () => {
			const { wrapper } = setup({ type: CardReactionType.STAR });

			await wrapper.find("[data-testid=card-reaction-star-4]").trigger("click");

			expect(lastReaction(wrapper)).toBe(4);
		});

		it("should show the average rather than the sum", () => {
			const { wrapper } = setup({ type: CardReactionType.STAR, count: 2, sum: 7 });

			expect(wrapper.find("[data-testid=card-reaction-summary]").text()).toContain("3.5");
		});

		it("should say so while nobody has rated", () => {
			const { wrapper } = setup({ type: CardReactionType.STAR });

			expect(wrapper.find("[data-testid=card-reaction-summary]").text()).not.toContain("NaN");
		});
	});

	describe("when the board collects votes", () => {
		it("should show the net score", () => {
			const { wrapper } = setup({ type: CardReactionType.VOTE, count: 5, sum: -2 });

			expect(wrapper.find("[data-testid=card-reaction-summary]").text()).toBe("-2");
		});

		it("should send a downvote", async () => {
			const { wrapper } = setup({ type: CardReactionType.VOTE });

			await wrapper.find("[data-testid=card-reaction-downvote]").trigger("click");

			expect(lastReaction(wrapper)).toBe(-1);
		});

		it("should switch from a downvote to an upvote in one click", async () => {
			const { wrapper } = setup({ type: CardReactionType.VOTE, count: 1, sum: -1, ownValue: -1 });

			await wrapper.find("[data-testid=card-reaction-upvote]").trigger("click");

			expect(lastReaction(wrapper)).toBe(1);
		});
	});

	describe("in every mode", () => {
		it("should never name who reacted", () => {
			const { wrapper } = setup({ count: 3, sum: 3, ownValue: 1 });

			expect(wrapper.html()).not.toContain("userId");
		});
	});
});
