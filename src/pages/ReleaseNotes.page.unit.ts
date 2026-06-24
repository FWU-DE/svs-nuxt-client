import ReleaseNotesPage from "./ReleaseNotes.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestEnvStore, mockApi, mockApiResponse, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { ReleaseApiInterface, ReleaseItemResponse } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("ReleaseNotesPage", () => {
	let releaseApi: Mocked<ReleaseApiInterface>;
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
		releaseApi = mockApi<ReleaseApiInterface>();
		vi.spyOn(serverApi, "ReleaseApiFactory").mockReturnValue(releaseApi);
	});

	const setup = (releases: ReleaseItemResponse[] = []) => {
		releaseApi.releaseControllerGetReleases.mockResolvedValue(
			mockApiResponse({
				data: { data: releases },
			})
		);

		const wrapper = mount(ReleaseNotesPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: ["RenderHTML"],
			},
		});

		return { wrapper };
	};

	it("renders an empty state", async () => {
		const { wrapper } = setup();
		await flushPromises();

		expect(wrapper.find("[data-testid='release-notes-empty']").exists()).toBe(true);
	});

	it("renders release notes sorted by publish date", async () => {
		const older = {
			id: "older",
			name: "Older release",
			body: "- old",
			url: "https://example.com/older",
			author: "author",
			authorUrl: "https://example.com/author",
			createdAt: "2025-01-01T00:00:00.000Z",
			publishedAt: "2025-01-01T00:00:00.000Z",
		};
		const newer = {
			...older,
			id: "newer",
			name: "Newer release",
			publishedAt: "2026-01-01T00:00:00.000Z",
		};

		const { wrapper } = setup([older, newer]);
		await flushPromises();

		const text = wrapper.text();
		expect(text.indexOf("Newer release")).toBeLessThan(text.indexOf("Older release"));
		expect(wrapper.find("[data-testid='release-notes-list']").exists()).toBe(true);
	});
});
