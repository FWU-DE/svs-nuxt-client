import CardComment from "./CardComment.vue";
import CardCommentSection from "./CardCommentSection.vue";
import de from "@/locales/de";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { CardCommentResponse } from "@api-server";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

const buildComment = (overrides: Partial<CardCommentResponse> = {}): CardCommentResponse => ({
	id: "comment-1",
	text: "Ich habe eine Frage dazu.",
	authorId: "user-1",
	authorName: "Marie Muster",
	isOwn: false,
	isRemoved: false,
	removedByModerator: false,
	isEdited: false,
	ownReport: false,
	timestamps: { createdAt: "2026-01-01T00:00:00Z", lastUpdatedAt: "2026-01-01T00:00:00Z" },
	...overrides,
});

const setup = (options: { comments?: CardCommentResponse[]; canModerate?: boolean } = {}) => {
	const wrapper = mount(CardCommentSection, {
		global: {
			plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
		},
		props: {
			comments: options.comments ?? [],
			canModerate: options.canModerate ?? false,
		},
	});

	return { wrapper };
};

const open = async (wrapper: ReturnType<typeof setup>["wrapper"]) => {
	await wrapper.find("[data-testid=card-comment-toggle]").trigger("click");
};

describe("CardCommentSection", () => {
	describe("when the section is collapsed", () => {
		it("should count only the comments there are to read", () => {
			const { wrapper } = setup({
				comments: [buildComment(), buildComment({ id: "comment-2", isRemoved: true })],
			});

			expect(wrapper.find("[data-testid=card-comment-toggle]").text()).toContain("1");
		});
	});

	describe("when a comment is written", () => {
		it("should not send an empty comment", async () => {
			const { wrapper } = setup();
			await open(wrapper);

			expect(wrapper.find("[data-testid=card-comment-submit]").attributes("disabled")).toBeDefined();
		});

		it("should send the trimmed text", async () => {
			const { wrapper } = setup();
			await open(wrapper);

			await wrapper.findComponent({ name: "VTextarea" }).setValue("  Eine Frage  ");
			await wrapper.find("[data-testid=card-comment-submit]").trigger("click");

			expect(wrapper.emitted("add")?.at(-1)).toEqual(["Eine Frage"]);
		});

		it("should send it on Enter, which is what people expect of a comment box", async () => {
			const { wrapper } = setup();
			await open(wrapper);

			await wrapper.findComponent({ name: "VTextarea" }).setValue("Per Enter");
			await wrapper.find("[data-testid=card-comment-input] textarea").trigger("keydown.enter");

			expect(wrapper.emitted("add")?.at(-1)).toEqual(["Per Enter"]);
		});

		it("should not send on Shift+Enter, which writes a second line", async () => {
			const { wrapper } = setup();
			await open(wrapper);

			await wrapper.findComponent({ name: "VTextarea" }).setValue("Erste Zeile");
			await wrapper.find("[data-testid=card-comment-input] textarea").trigger("keydown.enter", { shiftKey: true });

			expect(wrapper.emitted("add")).toBeUndefined();
		});

		it("should clear the box after sending, so the next comment starts empty", async () => {
			const { wrapper } = setup();
			await open(wrapper);

			await wrapper.findComponent({ name: "VTextarea" }).setValue("Eine Frage");
			await wrapper.find("[data-testid=card-comment-submit]").trigger("click");

			expect((wrapper.find("[data-testid=card-comment-input] textarea").element as HTMLTextAreaElement).value).toBe("");
		});
	});

	describe("when a comment carries a date", () => {
		it("should show it relative and keep the exact one in the tooltip", async () => {
			const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
			const { wrapper } = setup({
				comments: [buildComment({ timestamps: { createdAt: twoHoursAgo, lastUpdatedAt: twoHoursAgo } })],
			});
			await open(wrapper);

			const date = wrapper.find("[data-testid=card-comment-date]");
			expect(date.text()).not.toBe("");
			expect(date.attributes("title")).toContain("2026");
			expect(date.attributes("datetime")).toBe(twoHoursAgo);
		});
	});

	describe("when a removed comment is shown", () => {
		it("should say it was removed instead of showing its text", async () => {
			const { wrapper } = setup({ comments: [buildComment({ isRemoved: true, text: "" })] });
			await open(wrapper);

			expect(wrapper.find("[data-testid=card-comment-removed]").exists()).toBe(true);
		});

		it("should distinguish a withdrawal from a moderation", async () => {
			const { wrapper } = setup({
				comments: [buildComment({ isRemoved: true, removedByModerator: true, text: "" })],
			});
			await open(wrapper);

			expect(wrapper.find("[data-testid=card-comment-removed]").text()).toBe(
				de["components.boardCard.comment.removedByModerator"]
			);
		});
	});

	describe("when the report count is present", () => {
		it("should be shown, since only moderators ever receive it", async () => {
			const { wrapper } = setup({ comments: [buildComment({ reportCount: 2 })], canModerate: true });
			await open(wrapper);

			expect(wrapper.find("[data-testid=card-comment-report-count]").text()).toContain("2");
		});

		it("should be absent for a reader who did not receive it", async () => {
			const { wrapper } = setup({ comments: [buildComment()] });
			await open(wrapper);

			expect(wrapper.find("[data-testid=card-comment-report-count]").exists()).toBe(false);
		});
	});
});

const mountComment = (comment: CardCommentResponse, canModerate = false) =>
	mount(CardComment, {
		attachTo: document.body,
		global: {
			plugins: [createTestingVuetify(), createTestingI18n({ locale: "de", fallbackLocale: "de", messages: { de } })],
		},
		props: { comment, canModerate },
	});

/** The action menu is a VMenu, so its items only exist once opened, and outside the wrapper. */
const openMenu = async (wrapper: ReturnType<typeof mountComment>) => {
	await wrapper.find(`[data-testid=card-comment-menu-${wrapper.props("comment").id}]`).trigger("click");
	await nextTick();
	await nextTick();
};

const menuItem = (testId: string) => document.body.querySelector(`[data-testid=${testId}]`);

describe("CardComment", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	describe("when the comment belongs to someone else", () => {
		it("should not offer editing it", async () => {
			const wrapper = mountComment(buildComment());
			await openMenu(wrapper);

			expect(menuItem("card-comment-action-edit")).toBeNull();
		});

		it("should offer reporting it", async () => {
			const wrapper = mountComment(buildComment());
			await openMenu(wrapper);

			expect(menuItem("card-comment-action-report")).not.toBeNull();
		});

		it("should not offer removing it without moderation rights", async () => {
			const wrapper = mountComment(buildComment());
			await openMenu(wrapper);

			expect(menuItem("card-comment-action-remove")).toBeNull();
		});

		it("should offer removing it with moderation rights", async () => {
			const wrapper = mountComment(buildComment(), true);
			await openMenu(wrapper);

			expect(menuItem("card-comment-action-remove")).not.toBeNull();
		});

		it("should not offer reporting it twice", async () => {
			const wrapper = mountComment(buildComment({ ownReport: true }));
			await openMenu(wrapper);

			expect(menuItem("card-comment-action-report")).toBeNull();
		});
	});

	describe("when the comment is the reader's own", () => {
		it("should offer editing and removing but not reporting", async () => {
			const wrapper = mountComment(buildComment({ isOwn: true }));
			await openMenu(wrapper);

			expect(menuItem("card-comment-action-edit")).not.toBeNull();
			expect(menuItem("card-comment-action-remove")).not.toBeNull();
			expect(menuItem("card-comment-action-report")).toBeNull();
		});

		it("should send the edited text", async () => {
			const wrapper = mountComment(buildComment({ isOwn: true }));
			await openMenu(wrapper);

			(menuItem("card-comment-action-edit") as HTMLElement).click();
			await nextTick();
			await wrapper.findComponent({ name: "VTextarea" }).setValue("Korrigiert");
			await wrapper.find("[data-testid=card-comment-edit-save]").trigger("click");

			expect(wrapper.emitted("edit")?.at(-1)).toEqual(["comment-1", "Korrigiert"]);
		});
	});
});
