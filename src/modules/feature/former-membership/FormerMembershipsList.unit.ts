import FormerMembershipsList from "./FormerMembershipsList.vue";
import * as confirmDialogUtils from "@/utils/confirmation-dialog.utils";
import { expectNotification, mockedPiniaStoreTyping } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { FormerMembershipListItemResponse, FormerMembershipType } from "@api-server";
import { useFormerMembershipStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { VBtn } from "vuetify/lib/components/index";

describe("FormerMembershipsList", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const courseEntry: FormerMembershipListItemResponse = {
		type: FormerMembershipType.COURSE,
		refId: "course-id",
		name: "My course",
		schoolId: "school-id",
		removedAt: new Date().toISOString(),
	};

	const setup = (formerMemberships: FormerMembershipListItemResponse[] = [courseEntry]) => {
		const formerMembershipStore = mockedPiniaStoreTyping(useFormerMembershipStore);
		formerMembershipStore.formerMemberships = formerMemberships;

		const wrapper = mount(FormerMembershipsList, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

		return { wrapper, formerMembershipStore };
	};

	it("should fetch former memberships on mount", () => {
		const { formerMembershipStore } = setup();

		expect(formerMembershipStore.fetchFormerMemberships).toHaveBeenCalled();
	});

	it("should not render the section when there are no former memberships", () => {
		const { wrapper } = setup([]);

		expect(wrapper.find("[data-testid=former-memberships-section]").exists()).toBe(false);
	});

	it("should render a row with a reclaim and a discard button for each entry", () => {
		const { wrapper } = setup();

		expect(wrapper.find(`[data-testid=reclaim-button-${courseEntry.refId}]`).exists()).toBe(true);
		expect(wrapper.find(`[data-testid=discard-button-${courseEntry.refId}]`).exists()).toBe(true);
	});

	describe("when the reclaim button is clicked", () => {
		it("should ask for confirmation and reclaim the entry when confirmed", async () => {
			vi.spyOn(confirmDialogUtils, "askConfirmation").mockResolvedValue(true);
			const { wrapper, formerMembershipStore } = setup();
			formerMembershipStore.reclaimFormerMembership.mockResolvedValueOnce(true);

			await wrapper.find(`[data-testid=reclaim-button-${courseEntry.refId}]`).trigger("click");

			expect(confirmDialogUtils.askConfirmation).toHaveBeenCalledWith({
				title: "pages.formerMemberships.reclaim.confirmation",
				messageType: "info",
				confirmBtnKey: "pages.formerMemberships.reclaim.action",
			});
			expect(formerMembershipStore.reclaimFormerMembership).toHaveBeenCalledWith(courseEntry.type, courseEntry.refId);
			expectNotification("success");
		});

		it("should not reclaim the entry when the confirmation is cancelled", async () => {
			vi.spyOn(confirmDialogUtils, "askConfirmation").mockResolvedValue(false);
			const { wrapper, formerMembershipStore } = setup();

			await wrapper.find(`[data-testid=reclaim-button-${courseEntry.refId}]`).trigger("click");

			expect(formerMembershipStore.reclaimFormerMembership).not.toHaveBeenCalled();
		});

		it("should notify that the entry is no longer available when reclaiming reports false", async () => {
			vi.spyOn(confirmDialogUtils, "askConfirmation").mockResolvedValue(true);
			const { wrapper, formerMembershipStore } = setup();
			formerMembershipStore.reclaimFormerMembership.mockResolvedValueOnce(false);

			await wrapper.find(`[data-testid=reclaim-button-${courseEntry.refId}]`).trigger("click");

			expectNotification("info");
		});
	});

	describe("when the discard button is clicked", () => {
		it("should ask for confirmation (as a warning) and discard the entry when confirmed", async () => {
			vi.spyOn(confirmDialogUtils, "askConfirmation").mockResolvedValue(true);
			const { wrapper, formerMembershipStore } = setup();
			formerMembershipStore.discardFormerMembership.mockResolvedValueOnce(true);

			await wrapper.find(`[data-testid=discard-button-${courseEntry.refId}]`).trigger("click");

			expect(confirmDialogUtils.askConfirmation).toHaveBeenCalledWith({
				title: "pages.formerMemberships.discard.confirmation",
				messageType: "warning",
				confirmBtnKey: "pages.formerMemberships.discard.action",
			});
			expect(formerMembershipStore.discardFormerMembership).toHaveBeenCalledWith(courseEntry.type, courseEntry.refId);
			expectNotification("success");
		});

		it("should not discard the entry when the confirmation is cancelled", async () => {
			vi.spyOn(confirmDialogUtils, "askConfirmation").mockResolvedValue(false);
			const { wrapper, formerMembershipStore } = setup();

			await wrapper.find(`[data-testid=discard-button-${courseEntry.refId}]`).trigger("click");

			expect(formerMembershipStore.discardFormerMembership).not.toHaveBeenCalled();
		});
	});

	it("should render buttons using VBtn", () => {
		const { wrapper } = setup();

		expect(wrapper.findAllComponents(VBtn).length).toBeGreaterThanOrEqual(2);
	});
});
