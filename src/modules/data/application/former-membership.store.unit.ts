import { initializeAxios } from "@/utils/api";
import { mockApi, mockAxiosInstance } from "@@/tests/test-utils";
import * as serverApi from "@api-server";
import { FormerMembershipListItemResponse, FormerMembershipType } from "@api-server";
import { useFormerMembershipStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("useFormerMembershipStore", () => {
	let formerMembershipApiMock: Mocked<serverApi.FormerMembershipApiInterface>;
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		formerMembershipApiMock = mockApi<serverApi.FormerMembershipApiInterface>();
		axiosMock = mockAxiosInstance();

		vi.spyOn(serverApi, "FormerMembershipApiFactory").mockReturnValue(formerMembershipApiMock);
		initializeAxios(axiosMock);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const buildEntry = (overrides: Partial<FormerMembershipListItemResponse> = {}): FormerMembershipListItemResponse => ({
		type: FormerMembershipType.COURSE,
		refId: "course-id",
		name: "My course",
		schoolId: "school-id",
		removedAt: new Date().toISOString(),
		...overrides,
	});

	describe("fetchFormerMemberships", () => {
		it("should call the API and populate the list", async () => {
			const entries = [buildEntry()];
			formerMembershipApiMock.formerMembershipControllerList.mockResolvedValueOnce({ data: entries } as never);

			const store = useFormerMembershipStore();
			await store.fetchFormerMemberships();

			expect(formerMembershipApiMock.formerMembershipControllerList).toHaveBeenCalled();
			expect(store.formerMemberships).toEqual(entries);
		});
	});

	describe("reclaimFormerMembership", () => {
		it("should call the API, remove the entry from the list, and return the reclaimed flag on success", async () => {
			const entry = buildEntry();
			formerMembershipApiMock.formerMembershipControllerReclaim.mockResolvedValueOnce({
				data: { reclaimed: true },
			} as never);

			const store = useFormerMembershipStore();
			store.formerMemberships = [entry];

			const result = await store.reclaimFormerMembership(entry.type, entry.refId);

			expect(formerMembershipApiMock.formerMembershipControllerReclaim).toHaveBeenCalledWith(entry.type, entry.refId);
			expect(result).toBe(true);
			expect(store.formerMemberships).toEqual([]);
		});

		it("should keep the entry in the list and return false when the API call fails", async () => {
			const entry = buildEntry();
			formerMembershipApiMock.formerMembershipControllerReclaim.mockRejectedValueOnce(new Error("API error"));

			const store = useFormerMembershipStore();
			store.formerMemberships = [entry];

			const result = await store.reclaimFormerMembership(entry.type, entry.refId);

			expect(result).toBe(false);
			expect(store.formerMemberships).toEqual([entry]);
		});
	});

	describe("discardFormerMembership", () => {
		it("should call the API, remove only the matching entry, and return true on success", async () => {
			const toDiscard = buildEntry();
			const toKeep = buildEntry({ refId: "room-id", type: FormerMembershipType.ROOM });
			formerMembershipApiMock.formerMembershipControllerDiscard.mockResolvedValueOnce({ data: undefined } as never);

			const store = useFormerMembershipStore();
			store.formerMemberships = [toDiscard, toKeep];

			const result = await store.discardFormerMembership(toDiscard.type, toDiscard.refId);

			expect(formerMembershipApiMock.formerMembershipControllerDiscard).toHaveBeenCalledWith(
				toDiscard.type,
				toDiscard.refId
			);
			expect(result).toBe(true);
			expect(store.formerMemberships).toEqual([toKeep]);
		});

		it("should keep the list unchanged and return false when the API call fails", async () => {
			const entry = buildEntry();
			formerMembershipApiMock.formerMembershipControllerDiscard.mockRejectedValueOnce(new Error("API error"));

			const store = useFormerMembershipStore();
			store.formerMemberships = [entry];

			const result = await store.discardFormerMembership(entry.type, entry.refId);

			expect(result).toBe(false);
			expect(store.formerMemberships).toEqual([entry]);
		});
	});
});
