import SkipRegistrationPage from "./SkipRegistration.page.vue";
import { useLegacyUserImportApi } from "@/composables/legacy-user-import.api";
import * as utils from "@/utils/api";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { notifyError } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@/composables/legacy-user-import.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-user-import.api")>()),
	useLegacyUserImportApi: vi.fn(),
}));
vi.mock("@/utils/api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/utils/api")>()),
	$axios: { get: vi.fn() },
}));
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	notifyError: vi.fn(),
}));

const STUDENT = "0000d224816abba584714c9c";

const setup = async (skip: () => Promise<void>) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore();
	vi.mocked(utils.$axios.get).mockResolvedValue({
		data: { _id: STUDENT, firstName: "Anna", lastName: "Eins", email: "anna@example.org", importHash: "h" },
	});
	const api = { importCsv: vi.fn(), skipRegistration: vi.fn(skip) };
	vi.mocked(useLegacyUserImportApi).mockReturnValue(api);
	const router = createRouter({
		history: createWebHistory(),
		routes: [
			{ path: "/administration/students/:id/skipregistration", component: SkipRegistrationPage },
			{ path: "/:rest(.*)*", component: { template: "<div />" } },
		],
	});
	await router.push(`/administration/students/${STUDENT}/skipregistration`);
	await router.isReady();
	const wrapper = mount(SkipRegistrationPage, {
		global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
	});
	await flushPromises();
	return { wrapper, api };
};

describe("SkipRegistrationPage", () => {
	it("prefills a start password and ticks all consents as analog", async () => {
		const { wrapper } = await setup(() => Promise.resolve());
		const password = wrapper.find('[data-testid="skip-password"] input').element as HTMLInputElement;
		expect(password.value).toMatch(/^[a-zA-Z0-9]{8}$/);
		for (const id of [
			"parent-privacy-consent",
			"parent-terms-consent",
			"student-privacy-consent",
			"student-terms-consent",
		]) {
			expect((wrapper.find(`[data-testid="${id}"] input`).element as HTMLInputElement).checked).toBe(true);
		}
	});

	it("sends the consents, the birthday at midnight UTC and shows the credentials once", async () => {
		const { wrapper, api } = await setup(() => Promise.resolve());
		await wrapper.find('[data-testid="skip-birthday"] input').setValue("2012-05-04");
		await wrapper.find('[data-testid="parent-terms-consent"] input').setValue(false);
		await wrapper.find('[data-testid="skip-password"] input').setValue("Start1234");
		await wrapper.find('[data-testid="skip-registration-form"]').trigger("submit");
		await flushPromises();

		expect(api.skipRegistration).toHaveBeenCalledWith(STUDENT, {
			password: "Start1234",
			birthday: "2012-05-04T00:00:00.000Z",
			parent_privacyConsent: true,
			parent_termsOfUseConsent: undefined,
			privacyConsent: true,
			termsOfUseConsent: true,
		});
		expect(wrapper.find('[data-testid="registration-complete"]').exists()).toBe(true);
		const credentials = wrapper.find('[data-testid="skip-registration-credentials"] textarea')
			.element as HTMLTextAreaElement;
		expect(credentials.value).toContain("Anna Eins");
		expect(credentials.value).toContain("E-Mail: anna@example.org");
		expect(credentials.value).toContain("Start1234");
	});

	it("keeps the form and reports a failure", async () => {
		const { wrapper } = await setup(() => Promise.reject(new Error("400")));
		await wrapper.find('[data-testid="skip-birthday"] input').setValue("2012-05-04");
		await wrapper.find('[data-testid="skip-registration-form"]').trigger("submit");
		await flushPromises();
		expect(notifyError).toHaveBeenCalledWith("legacy.administration.controller.text.setupFailed");
		expect(wrapper.find('[data-testid="registration-complete"]').exists()).toBe(false);
	});
});
