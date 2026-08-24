import { RoomCreateParams } from "@/types/room/Room";
import { createTestEnvStore, createTestRoomStore, mockApiResponse, roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { RoomColor, RoomFeatures } from "@api-server";
import { getRoomTemplateById } from "@data-room";
import { RoomForm, RoomTemplatePicker } from "@feature-room";
import { RoomCreatePage } from "@page-room";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouterMock, getRouter, injectRouterMock } from "vue-router-mock";

vi.mock("@/utils/api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/utils/api")>()),
	$axios: { defaults: { baseURL: "/api" } },
}));

describe("@pages/RoomCreate.page.vue", () => {
	const setup = (options: { isAiEnabled?: boolean } = {}) => {
		injectRouterMock(createRouterMock());
		createTestEnvStore({ FEATURE_ROOM_AI_TEMPLATE_ENABLED: options.isAiEnabled ?? false });

		const wrapper = mount(RoomCreatePage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

		const { roomStore } = createTestRoomStore();

		// the form is only shown once a template was picked
		const selectTemplate = async (templateId = "blank") => {
			await wrapper.find(`[data-testid="room-template-${templateId}"]`).trigger("click");
			return wrapper.findComponent(RoomForm);
		};

		return {
			wrapper,
			roomStore,
			selectTemplate,
		};
	};

	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	it("should start with the template picker", () => {
		const { wrapper } = setup();

		expect(wrapper.findComponent(RoomTemplatePicker).exists()).toBe(true);
		expect(wrapper.findComponent(RoomForm).exists()).toBe(false);
	});

	it("should show the form for the picked template", async () => {
		const { wrapper, selectTemplate } = setup();

		const roomFormComponent = await selectTemplate("subject");

		expect(roomFormComponent.exists()).toBe(true);
		expect(wrapper.findComponent(RoomTemplatePicker).exists()).toBe(false);
		expect(wrapper.find('[data-testid="room-template-summary"]').exists()).toBe(true);
	});

	it("should prefill the form with the values of the picked template", async () => {
		const { selectTemplate } = setup();
		const template = getRoomTemplateById("project");

		const roomFormComponent = await selectTemplate("project");

		expect(roomFormComponent.props("room")).toEqual({
			name: template?.roomNameKey,
			color: RoomColor.ORANGE,
			features: [RoomFeatures.EDITOR_MANAGE_VIDEOCONFERENCE],
		});
	});

	it("should show the structure of the picked template", async () => {
		const { wrapper, selectTemplate } = setup();

		await selectTemplate("weeklyPlan");

		// four week columns by default, plus the fixed help and archive column
		expect(wrapper.findAll('[data-testid^="template-column-0-"]')).toHaveLength(6);
	});

	it("should rebuild the structure when a param changes", async () => {
		const { wrapper, selectTemplate } = setup();
		await selectTemplate("weeklyPlan");

		await wrapper.find('[data-testid="room-template-param-weeks"] input').setValue("2");

		expect(wrapper.findAll('[data-testid^="template-column-0-"]')).toHaveLength(4);
	});

	it("should clamp a param to the range of the template", async () => {
		const { wrapper, selectTemplate } = setup();
		await selectTemplate("weeklyPlan");

		await wrapper.find('[data-testid="room-template-param-weeks"] input').setValue("99");

		// at most twelve weeks, plus the fixed help and archive column
		expect(wrapper.findAll('[data-testid^="template-column-0-"]')).toHaveLength(14);
	});

	it("should return to the template picker on 'change template'", async () => {
		const { wrapper, selectTemplate } = setup();
		await selectTemplate("subject");

		await wrapper.find('[data-testid="room-template-change-btn"]').trigger("click");

		expect(wrapper.findComponent(RoomTemplatePicker).exists()).toBe(true);
	});

	it("should navigate to 'room-details' with correct room id on save", async () => {
		const { roomStore, selectTemplate } = setup();

		const roomParams: RoomCreateParams = {
			name: "test",
			color: RoomColor.BLUE,
			features: [],
		};

		roomStore.createRoom.mockResolvedValue({
			result: mockApiResponse({ data: roomItemFactory.build({ id: "123" }) }),
			success: true,
		});
		const roomFormComponent = await selectTemplate();
		emitSave(roomFormComponent, roomParams);
		await flushPromises();

		expect(roomStore.createRoom).toHaveBeenCalledWith(roomParams);
		expect(getRouter().push).toHaveBeenCalledWith({
			name: "room-details",
			params: { id: "123" },
		});
	});

	it("should stay on the page when the room could not be created", async () => {
		const { roomStore, selectTemplate } = setup();

		roomStore.createRoom.mockResolvedValue({
			error: { code: 400 } as unknown as Error,
			success: false,
		});
		const roomFormComponent = await selectTemplate();
		emitSave(roomFormComponent, { name: "test", color: RoomColor.BLUE, features: [] });
		await flushPromises();

		expect(getRouter().push).not.toHaveBeenCalled();
	});

	it("should navigate to 'rooms' on cancel", async () => {
		const { selectTemplate } = setup();

		const roomFormComponent = await selectTemplate();
		roomFormComponent.vm.$emit("cancel");

		expect(getRouter().push).toHaveBeenCalledWith({ name: "rooms" });
	});

	describe("the ai mode", () => {
		const encoder = new TextEncoder();

		const streamResponse = (chunks: string[]) =>
			({
				ok: true,
				body: new ReadableStream<Uint8Array>({
					start(controller) {
						chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
						controller.close();
					},
				}),
			}) as Response;

		const suggestion = [
			'{"type":"roomName","name":"Mathe 9b"}\n',
			'{"type":"board","title":"Lernpfad","layout":"columns"}\n',
			'{"type":"column","title":"Einstieg"}\n{"type":"card","title":"Video"}\n',
		];

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		const generate = async (wrapper: VueWrapper) => {
			await wrapper.find('[data-testid="room-ai-prompt-input"] textarea').setValue("Mathe 9b, Bruchrechnung");
			await wrapper.find('[data-testid="room-ai-generate-btn"]').trigger("click");
			await flushPromises();
		};

		it("should stay hidden while the feature is off", () => {
			const { wrapper } = setup();

			expect(wrapper.find('[data-testid="room-ai-prompt"]').exists()).toBe(false);
		});

		it("should show the suggested structure", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(suggestion)));
			const { wrapper } = setup({ isAiEnabled: true });

			await generate(wrapper);

			expect(wrapper.find('[data-testid="template-card-0-0-0"]').text()).toContain("Video");
		});

		it("should take the suggested name into the form", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(suggestion)));
			const { wrapper } = setup({ isAiEnabled: true });
			await generate(wrapper);

			await wrapper.find('[data-testid="room-ai-accept-btn"]').trigger("click");

			expect(wrapper.findComponent(RoomForm).props("room")).toEqual(expect.objectContaining({ name: "Mathe 9b" }));
		});

		it("should return to the picker when the suggestion is discarded", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(suggestion)));
			const { wrapper } = setup({ isAiEnabled: true });
			await generate(wrapper);

			await wrapper.find('[data-testid="room-ai-discard-btn"]').trigger("click");

			expect(wrapper.findComponent(RoomTemplatePicker).exists()).toBe(true);
		});
	});

	const emitSave = (roomFormComponent: VueWrapper, room: RoomCreateParams) =>
		roomFormComponent.vm.$emit("save", { room });
});
