import { useQuickNavApi } from "./QuickNavApi.composable";
import { QuickNavKind } from "./types";
import { initializeAxios } from "@/utils/api";
import { mockAxiosInstance } from "@@/tests/test-utils";
import { AxiosInstance } from "axios";
import { Mocked } from "vitest";

vi.mock("@util-logger");

const roomResult = {
	id: "room-1",
	type: "room",
	title: "Ökosystem See",
	subtitle: "",
	url: "/rooms/room-1",
};

const setup = () => {
	const axios: Mocked<AxiosInstance> = mockAxiosInstance();
	initializeAxios(axios);

	return { axios, api: useQuickNavApi() };
};

describe("QuickNavApi Composable", () => {
	describe("when the query is shorter than the server accepts", () => {
		it("does not ask the server at all", async () => {
			const { axios, api } = setup();

			await api.search("B");

			expect(axios.get).not.toHaveBeenCalled();
			expect(api.results.value).toEqual([]);
		});
	});

	describe("when the server answers", () => {
		it("turns the results into palette entries", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: { data: [roomResult], query: "See" } });

			await api.search("See");

			expect(axios.get).toHaveBeenCalledWith("/v3/quick-search", { params: { query: "See", limit: 10 } });
			expect(api.results.value).toEqual([
				{
					id: "room:room-1",
					kind: QuickNavKind.ROOM,
					title: "Ökosystem See",
					subtitle: undefined,
					icon: expect.any(String),
					to: "/rooms/room-1",
				},
			]);
			expect(api.isSearching.value).toBe(false);
		});
	});

	describe("when an earlier answer arrives after a later one", () => {
		it("keeps the results of the query the user actually typed", async () => {
			const { axios, api } = setup();

			let resolveSlow: (value: unknown) => void = () => undefined;
			axios.get
				.mockImplementationOnce(
					() =>
						new Promise((resolve) => {
							resolveSlow = resolve;
						})
				)
				.mockResolvedValueOnce({
					data: { data: [{ ...roomResult, id: "room-2", title: "Biologie" }], query: "Biologie" },
				});

			const slow = api.search("Bio");
			await api.search("Biologie");

			resolveSlow({ data: { data: [roomResult], query: "Bio" } });
			await slow;

			expect(api.results.value).toHaveLength(1);
			expect(api.results.value[0].title).toBe("Biologie");
		});
	});

	describe("when the request fails", () => {
		it("reports the failure and empties the results", async () => {
			const { axios, api } = setup();
			axios.get.mockRejectedValue(new Error("nope"));

			await api.search("See");

			expect(api.hasFailed.value).toBe(true);
			expect(api.results.value).toEqual([]);
			expect(api.isSearching.value).toBe(false);
		});
	});

	describe("when it is reset", () => {
		it("forgets the previous results", async () => {
			const { axios, api } = setup();
			axios.get.mockResolvedValue({ data: { data: [roomResult], query: "See" } });

			await api.search("See");
			api.reset();

			expect(api.results.value).toEqual([]);
			expect(api.hasFailed.value).toBe(false);
		});
	});
});
