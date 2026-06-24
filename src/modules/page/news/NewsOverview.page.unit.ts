import NewsOverviewPage from "./NewsOverview.page.vue";
import {
	createTestAppStore,
	createTestEnvStore,
	mockApi,
	mockApiResponse,
	newsResponseFactory,
} from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { NewsApiInterface, NewsListResponse, Permission } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("NewsOverviewPage", () => {
	let newsApi: Mocked<NewsApiInterface>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		newsApi = mockApi<NewsApiInterface>();
		vi.spyOn(serverApi, "NewsApiFactory").mockReturnValue(newsApi);
	});

	const setup = async ({
		canCreate = false,
		news = [newsResponseFactory.build({ id: "507f1f77bcf86cd799439011" })],
	} = {}) => {
		createTestAppStore({
			me: {
				permissions: canCreate ? [Permission.NEWS_CREATE] : [],
			},
		});
		newsApi.newsControllerFindAll.mockResolvedValue(
			mockApiResponse<NewsListResponse>({ data: { data: news, total: news.length, skip: 0, limit: 30 } })
		);

		const wrapper = mount(NewsOverviewPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});
		await flushPromises();
		return { wrapper, news };
	};

	it("renders news cards", async () => {
		const { wrapper, news } = await setup();

		expect(newsApi.newsControllerFindAll).toHaveBeenCalledWith(undefined, undefined, undefined, 0, 30);
		expect(wrapper.find("[data-testid='news-overview-title']").exists()).toBe(true);
		expect(wrapper.get(`[data-testid='news-card-${news[0].id}']`).text()).toContain(news[0].title);
	});

	it("renders create button only with permission", async () => {
		const { wrapper } = await setup({ canCreate: true });

		expect(wrapper.find("[data-testid='news-create-button']").exists()).toBe(true);
	});

	it("renders empty state", async () => {
		const { wrapper } = await setup({ news: [] });

		expect(wrapper.find("[data-testid='news-empty']").exists()).toBe(true);
	});
});
