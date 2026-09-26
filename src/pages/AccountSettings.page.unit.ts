import AccountSettingsPage from "./AccountSettings.page.vue";
import { initializeAxios } from "@/utils/api";
import { createTestAppStore, createTestEnvStore, mockApi, mockAxiosInstance } from "@@/tests/test-utils";
import { createTestSchoolStore } from "@@/tests/test-utils/factory/school-test.utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import * as serverApi from "@api-server";
import { AccountApiInterface, RoleName } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { AxiosInstance } from "axios";
import { setActivePinia } from "pinia";
import { Mocked } from "vitest";

describe("AccountSettingsPage", () => {
	let accountApi: Mocked<AccountApiInterface>;
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		createTestEnvStore({ SC_TITLE: "Test Cloud" });
		createTestAppStore({
			me: {
				school: { id: "school", name: "School" },
				user: { id: "user-1", firstName: "Ada", lastName: "Lovelace" },
				roles: [{ id: RoleName.TEACHER, name: RoleName.TEACHER }],
			},
		});
		createTestSchoolStore({ schoolDetails: { id: "school", name: "School" } });
		axiosMock = mockAxiosInstance();
		axiosMock.get.mockResolvedValue({ data: { email: "ada@example.org" } });
		initializeAxios(axiosMock);
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

	it("shows the e-mail address from the user record of the old API", async () => {
		const wrapper = setup();
		await flushPromises();

		expect(axiosMock.get).toHaveBeenCalledWith("/v1/users/user-1");
		expect((wrapper.get("[data-testid='account-email'] input").element as HTMLInputElement).value).toBe(
			"ada@example.org"
		);
	});

	it("sends a changed e-mail address together with the current password", async () => {
		accountApi.accountControllerUpdateMyAccount.mockResolvedValue({ data: undefined } as never);
		const wrapper = setup();
		await flushPromises();

		await wrapper.get("[data-testid='account-email'] input").setValue(" ada.byron@example.org ");
		await wrapper.get("[data-testid='account-current-password'] input").setValue("old-password");
		await wrapper.get("[data-testid='account-settings-form']").trigger("submit");
		await flushPromises();

		expect(accountApi.accountControllerUpdateMyAccount).toHaveBeenCalledWith(
			expect.objectContaining({ email: "ada.byron@example.org", passwordOld: "old-password" })
		);
	});

	it("does not send the e-mail address when it is unchanged", async () => {
		accountApi.accountControllerUpdateMyAccount.mockResolvedValue({ data: undefined } as never);
		const wrapper = setup();
		await flushPromises();

		await wrapper.get("[data-testid='account-last-name'] input").setValue("Byron");
		await wrapper.get("[data-testid='account-current-password'] input").setValue("old-password");
		await wrapper.get("[data-testid='account-settings-form']").trigger("submit");
		await flushPromises();

		const [payload] = accountApi.accountControllerUpdateMyAccount.mock.calls[0];
		expect(payload.email).toBeUndefined();
	});
});
