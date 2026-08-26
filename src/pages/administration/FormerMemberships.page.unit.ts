import FormerMemberships from "./FormerMemberships.page.vue";
import { mockedPiniaStoreTyping } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { FormerMembershipType } from "@api-server";
import { useFormerMembershipStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("FormerMemberships.page", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setup = () => {
		const formerMembershipStore = mockedPiniaStoreTyping(useFormerMembershipStore);
		formerMembershipStore.formerMemberships = [
			{
				type: FormerMembershipType.COURSE,
				refId: "course-id",
				name: "My course",
				schoolId: "school-id",
				removedAt: new Date().toISOString(),
			},
		];

		const wrapper = mount(FormerMemberships, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

		return { wrapper, formerMembershipStore };
	};

	it("should render the FormerMembershipsList", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid=former-memberships-section]").exists()).toBe(true);
	});

	it("should never show a dismiss button - this is the permanent, always-visible location", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid=former-memberships-banner-dismiss]").exists()).toBe(false);
	});
});
