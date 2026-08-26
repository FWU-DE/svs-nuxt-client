import FormerMembershipsBanner from "./FormerMembershipsBanner.vue";
import { mockedPiniaStoreTyping } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { FormerMembershipListItemResponse, FormerMembershipType } from "@api-server";
import { useFormerMembershipStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

// Same key the component persists dismissal under - see FormerMembershipsBanner.vue.
const DISMISSED_STORAGE_KEY = "former-memberships-banner-dismissed";

describe("FormerMembershipsBanner", () => {
	const courseEntry: FormerMembershipListItemResponse = {
		type: FormerMembershipType.COURSE,
		refId: "course-id",
		name: "My course",
		schoolId: "school-id",
		removedAt: new Date().toISOString(),
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		localStorage.clear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = (formerMemberships: FormerMembershipListItemResponse[] = [courseEntry]) => {
		const formerMembershipStore = mockedPiniaStoreTyping(useFormerMembershipStore);
		formerMembershipStore.formerMemberships = formerMemberships;

		const wrapper = mount(FormerMembershipsBanner, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

		return { wrapper, formerMembershipStore };
	};

	it("should render the list when not dismissed and there are former memberships", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid=former-memberships-section]").exists()).toBe(true);
		expect(wrapper.find("[data-testid=former-memberships-banner-dismiss]").exists()).toBe(true);
	});

	it("should not render the list or the dismiss button when there are no former memberships", () => {
		const { wrapper } = setup([]);

		expect(wrapper.find("[data-testid=former-memberships-section]").exists()).toBe(false);
		expect(wrapper.find("[data-testid=former-memberships-banner-dismiss]").exists()).toBe(false);
	});

	it("should hide the banner and persist the dismissal when the dismiss button is clicked", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid=former-memberships-banner-dismiss]").trigger("click");

		expect(wrapper.find("[data-testid=former-memberships-banner]").exists()).toBe(false);
		expect(localStorage.getItem(DISMISSED_STORAGE_KEY)).toBe("true");
	});

	it("should not render anything if the dismissal was already persisted before mounting", () => {
		localStorage.setItem(DISMISSED_STORAGE_KEY, "true");

		const { wrapper } = setup();

		expect(wrapper.find("[data-testid=former-memberships-banner]").exists()).toBe(false);
	});
});
