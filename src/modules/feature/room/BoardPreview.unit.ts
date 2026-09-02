import BoardPreview from "./BoardPreview.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout, BoardPreviewResponse, Colors, ContentElementType } from "@api-server";
import { mount } from "@vue/test-utils";

describe("@feature-room/BoardPreview", () => {
	const emptyPreview: BoardPreviewResponse = { columns: [], columnCount: 0 };

	const setup = (preview: BoardPreviewResponse, layout: BoardLayout = BoardLayout.COLUMNS) => {
		const wrapper = mount(BoardPreview, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { preview, layout },
		});

		return { wrapper };
	};

	const columnWithCards = (cardCount: number, color: Colors = Colors.TRANSPARENT) => ({
		title: `column ${cardCount}`,
		cardCount,
		cards: Array.from({ length: cardCount }, () => ({
			backgroundColor: color,
			elementTypes: [],
			elementCount: 0,
		})),
	});

	const columnWithOneCard = (elementTypes: ContentElementType[]) => ({
		title: "To do",
		cardCount: 1,
		cards: [{ backgroundColor: Colors.TRANSPARENT, elementTypes, elementCount: elementTypes.length }],
	});

	describe("when the board has no content", () => {
		it("should render a placeholder instead of columns", () => {
			const { wrapper } = setup(emptyPreview);

			expect(wrapper.find(".board-preview-empty").exists()).toBe(true);
			expect(wrapper.findAll(".board-preview-column")).toHaveLength(0);
		});
	});

	describe("when the board has columns and cards", () => {
		it("should render a mini column per column and a tile per card", () => {
			const { wrapper } = setup({
				columns: [columnWithCards(2), columnWithCards(1)],
				columnCount: 2,
			});

			expect(wrapper.findAll(".board-preview-column")).toHaveLength(2);
			expect(wrapper.findAll(".board-preview-card")).toHaveLength(3);
		});

		it("should paint the cards in their background color", () => {
			const { wrapper } = setup({ columns: [columnWithCards(1, Colors.AMBER)], columnCount: 1 });

			const card = wrapper.get(".board-preview-card");
			expect(card.attributes("style")).toContain("background-color");
		});

		it("should render one representation per element of a card", () => {
			const { wrapper } = setup({
				columnCount: 1,
				columns: [columnWithOneCard([ContentElementType.RICH_TEXT, ContentElementType.POLL])],
			});

			expect(wrapper.findAll(".board-preview-element")).toHaveLength(2);
		});

		it("should render only as many elements as fit on a card", () => {
			const { wrapper } = setup({
				columnCount: 1,
				columns: [columnWithOneCard([ContentElementType.RICH_TEXT, ContentElementType.POLL, ContentElementType.CODE])],
			});

			expect(wrapper.findAll(".board-preview-element")).toHaveLength(2);
		});
	});

	describe("element representations", () => {
		it("should render a text element as placeholder lines", () => {
			const { wrapper } = setup({ columnCount: 1, columns: [columnWithOneCard([ContentElementType.RICH_TEXT])] });

			const element = wrapper.get(".board-preview-element");
			expect(element.classes()).toContain("board-preview-element--text");
			expect(element.findAll(".board-preview-line")).toHaveLength(2);
		});

		it.each([
			["a drawing", ContentElementType.DRAWING],
			["a collaborative text editor", ContentElementType.COLLABORATIVE_TEXT_EDITOR],
		])("should render %s as the thumbnail the board itself shows", (_name, elementType) => {
			const { wrapper } = setup({ columnCount: 1, columns: [columnWithOneCard([elementType])] });

			const thumbnail = wrapper.get(".board-preview-thumbnail");
			expect(thumbnail.attributes("src")).toBeTruthy();
		});

		it("should let a thumbnail have the card to itself", () => {
			const { wrapper } = setup({
				columnCount: 1,
				columns: [columnWithOneCard([ContentElementType.RICH_TEXT, ContentElementType.DRAWING])],
			});

			expect(wrapper.findAll(".board-preview-element")).toHaveLength(1);
			expect(wrapper.find(".board-preview-thumbnail").exists()).toBe(true);
		});

		it("should render any other element as its icon", () => {
			const { wrapper } = setup({ columnCount: 1, columns: [columnWithOneCard([ContentElementType.POLL])] });

			const element = wrapper.get(".board-preview-element");
			expect(element.classes()).toContain("board-preview-element--icon");
			expect(element.find(".board-preview-icon").exists()).toBe(true);
		});

		it("should render a card without elements as a single placeholder line", () => {
			const { wrapper } = setup({ columnCount: 1, columns: [columnWithOneCard([])] });

			expect(wrapper.findAll(".board-preview-element")).toHaveLength(0);
			expect(wrapper.findAll(".board-preview-line")).toHaveLength(1);
		});
	});

	describe("when a column has no title", () => {
		it("should render a placeholder bar", () => {
			const { wrapper } = setup({
				columnCount: 1,
				columns: [{ title: undefined, cardCount: 0, cards: [] }],
			});

			expect(wrapper.find(".board-preview-column-title-placeholder").exists()).toBe(true);
		});
	});

	describe("when the board is bigger than the preview", () => {
		it("should count the columns it does not show", () => {
			const { wrapper } = setup({
				columns: [columnWithCards(0), columnWithCards(0)],
				columnCount: 7,
			});

			expect(wrapper.get(".board-preview-more--columns").text()).toBe("+5");
		});

		it("should count the cards it does not show", () => {
			const column = { ...columnWithCards(4), cardCount: 9 };
			const { wrapper } = setup({ columns: [column], columnCount: 1 });

			expect(wrapper.findAll(".board-preview-card")).toHaveLength(2);
			expect(wrapper.get(".board-preview-more").text()).toBe("+7");
		});
	});

	describe("when the board is a list board", () => {
		it("should stack the columns and show fewer of them", () => {
			const { wrapper } = setup(
				{ columns: [columnWithCards(2), columnWithCards(2), columnWithCards(2)], columnCount: 3 },
				BoardLayout.LIST
			);

			expect(wrapper.get(".board-preview").classes()).toContain("board-preview--list");
			expect(wrapper.findAll(".board-preview-column")).toHaveLength(2);
			expect(wrapper.findAll(".board-preview-card")).toHaveLength(4);
		});

		it("should give a single stacked column room for more cards", () => {
			const { wrapper } = setup({ columns: [columnWithCards(4)], columnCount: 1 }, BoardLayout.LIST);

			expect(wrapper.findAll(".board-preview-card")).toHaveLength(4);
		});
	});
});
