import { defaultParamValues, resolveRoomName, resolveTemplate } from "./roomTemplate.resolver";
import { getRoomTemplateById } from "./roomTemplates";
import { RoomTemplate, RoomTemplateParamValues } from "./types";
import { MessageSchema } from "@/locales/schema";
import { BoardLayout, RoomColor } from "@api-server";
import { describe, expect, it } from "vitest";

// stands in for vue-i18n: renders the key and fills its {placeholders} from the values
const translate = (key: keyof MessageSchema, values: RoomTemplateParamValues) =>
	key.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));

const template: RoomTemplate = {
	id: "test",
	icon: "icon",
	titleKey: "pages.roomCreate.templates.subject.title",
	descriptionKey: "pages.roomCreate.templates.subject.description",
	roomNameKey: "{subject} {grade}" as keyof MessageSchema,
	color: RoomColor.BLUE,
	features: [],
	params: [
		{ key: "subject", labelKey: "pages.roomCreate.templates.params.subject", type: "text", defaultValue: "Mathe" },
		{ key: "weeks", labelKey: "pages.roomCreate.templates.params.weeks", type: "number", defaultValue: 2, min: 1 },
	],
	boards: [
		{
			titleKey: "Plan {subject}" as keyof MessageSchema,
			layout: BoardLayout.COLUMNS,
			columns: [
				{
					titleKey: "Woche {index}" as keyof MessageSchema,
					repeatParam: "weeks",
					cards: [
						{
							titleKey: "Ziele Woche {index}" as keyof MessageSchema,
							elements: [{ kind: "text", textKey: "{subject} Woche {index}" as keyof MessageSchema }],
						},
					],
				},
			],
		},
	],
};

describe("roomTemplate.resolver", () => {
	describe("defaultParamValues", () => {
		it("should collect the defaults of every param", () => {
			expect(defaultParamValues(template)).toEqual({ subject: "Mathe", weeks: 2 });
		});

		it("should be empty for a template without params", () => {
			expect(defaultParamValues(getRoomTemplateById("blank") as RoomTemplate)).toEqual({});
		});
	});

	describe("resolveTemplate", () => {
		it("should fill the placeholders of titles and texts", () => {
			const [board] = resolveTemplate(template, { subject: "Physik", weeks: 1 }, translate);

			expect(board.title).toBe("Plan Physik");
			const [element] = board.columns[0].cards[0].elements;
			expect(element.kind === "text" && element.text).toBe("Physik Woche 1");
		});

		it("should repeat a column as often as its number param says", () => {
			const [board] = resolveTemplate(template, { subject: "Mathe", weeks: 3 }, translate);

			expect(board.columns.map((column) => column.title)).toEqual(["Woche 1", "Woche 2", "Woche 3"]);
			expect(board.columns[2].cards[0].title).toBe("Ziele Woche 3");
		});

		it("should drop a repeated column when its param is zero", () => {
			const [board] = resolveTemplate(template, { subject: "Mathe", weeks: 0 }, translate);

			expect(board.columns).toHaveLength(0);
		});

		it("should ignore a param value that is not a number", () => {
			const [board] = resolveTemplate(template, { subject: "Mathe", weeks: "viele" }, translate);

			expect(board.columns).toHaveLength(0);
		});
	});

	describe("resolveRoomName", () => {
		it("should build the name from the params", () => {
			expect(resolveRoomName(template, { subject: "Physik", grade: "10a" }, translate)).toBe("Physik 10a");
		});

		it("should be empty for a template without a name pattern", () => {
			expect(resolveRoomName(getRoomTemplateById("blank") as RoomTemplate, {}, translate)).toBe("");
		});
	});
});
