import AccountSettingsPage from "./AccountSettings.page.vue";
import { createTestAppStore, createTestEnvStore, mockApi } from "@@/tests/test-utils";
import { createTestSchoolStore } from "@@/tests/test-utils/factory/school-test.utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { AccountApiInterface, RoleName } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("AccountSettingsPage", () => {
	let accountApi: Mocked<AccountApiInterface>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		createTestAppStore({
			me: {
				school: { id: "school", name: "School" },
				user: { firstName: "Ada", lastName: "Lovelace" },
				roles: [{ id: RoleName.TEACHER, name: RoleName.TEACHER }],
			},
		});
		createTestSchoolStore({ schoolDetails: { id: "school", name: "School" } });
		accountApi = mockApi<AccountApiInterface>();
		vi.spyOn(serverApi, "AccountApiFactory").mockReturnValue(accountApi);
	});

	const setup = () =>
		mount(AccountSettingsPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
		});

	it("renders current user data", async () => {
		const wrapper = setup();
		await flushPromises();

		expect((wrapper.get("[data-testid='account-first-name'] input").element as HTMLInputElement).value).toBe("Ada");
		expect((wrapper.get("[data-testid='account-last-name'] input").element as HTMLInputElement).value).toBe("Lovelace");
	});

	it("submits profile and password changes", async () => {
		accountApi.accountControllerUpdateMyAccount.mockResolvedValue({ data: undefined } as never);
		const wrapper = setup();
		await flushPromises();

		await wrapper.get("[data-testid='account-last-name'] input").setValue("Byron");
		await wrapper.get("[data-testid='account-current-password'] input").setValue("old-password");
		await wrapper.get("[data-testid='account-new-password'] input").setValue("new-password");
		await wrapper.get("[data-testid='account-password-confirmation'] input").setValue("new-password");
		await wrapper.get("[data-testid='account-settings-form']").trigger("submit");
		await flushPromises();

		expect(accountApi.accountControllerUpdateMyAccount).toHaveBeenCalledWith({
			passwordOld: "old-password",
			firstName: "Ada",
			lastName: "Byron",
			passwordNew: "new-password",
		});
	});
});
