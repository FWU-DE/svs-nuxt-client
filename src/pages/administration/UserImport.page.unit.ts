import UserImportPage from "./UserImport.page.vue";
import { useLegacyUserImportApi } from "@/composables/legacy-user-import.api";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useSchoolStore } from "@data-app";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

vi.mock("@/composables/legacy-user-import.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/composables/legacy-user-import.api")>()),
	useLegacyUserImportApi: vi.fn(),
}));
vi.mock("@data-app", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-app")>()),
	useSchoolStore: vi.fn(),
}));

const setup = async (kind: "students" | "teachers", report: object) => {
	setActivePinia(createTestingPinia());
	createTestEnvStore();
	vi.mocked(useSchoolStore).mockReturnValue({
		schoolDetails: {
			id: "school-1",
			currentYear: { id: "y2" },
			years: {
				schoolYears: [],
				activeYear: { id: "y2", name: "2026/27" },
				nextYear: { id: "y3", name: "2027/28" },
				lastYear: { id: "y1", name: "2025/26" },
			},
		},
	} as unknown as ReturnType<typeof useSchoolStore>);
	const api = { importCsv: vi.fn().mockResolvedValue(report), skipRegistration: vi.fn() };
	vi.mocked(useLegacyUserImportApi).mockReturnValue(api);
	const router = createRouter({
		history: createWebHistory(),
		routes: [{ path: "/:rest(.*)*", component: { template: "<div />" } }],
	});
	await router.push(`/administration/${kind}/import`);
	const wrapper = mount(UserImportPage, {
		props: { kind },
		global: { plugins: [router, createTestingVuetify(), createTestingI18n()] },
	});
	await flushPromises();
	return { wrapper, api };
};

const chooseFile = async (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"], content: string) => {
	const file = new File([content], "import.csv", { type: "text/csv" });
	const input = wrapper.find('[data-testid="csv-file"] input[type="file"]');
	Object.defineProperty(input.element, "files", { value: [file] });
	await input.trigger("change");
	await flushPromises();
};

describe("UserImportPage", () => {
	it("shows the legacy form with the example and the selectable school years", async () => {
		const { wrapper } = await setup("students", {});
		expect(wrapper.find('[data-testid="user-import-title"]').text()).toBe(
			"legacy.administration.controller.headline.studentImport"
		);
		expect(wrapper.find('[data-testid="csv-example"]').exists()).toBe(true);
		const select = wrapper.findComponent({ name: "VSelect" });
		expect(select.props("modelValue")).toBe("y2");
		expect((select.props("items") as { id: string }[]).map((y) => y.id)).toEqual(["y2", "y3", "y1"]);
	});

	it("imports the file for the role of the page and shows the report", async () => {
		const report = {
			success: false,
			errors: [{ type: "user", entity: "A,B,x", message: "Bitte gib eine valide E-Mail Adresse an!" }],
			classes: { successful: 0, failed: 0, created: 0, updated: 0 },
			users: { successful: 1, created: 1, updated: 0, failed: 1 },
			invitations: { successful: 0, failed: 0 },
		};
		const { wrapper, api } = await setup("teachers", report);
		await chooseFile(wrapper, "firstName,lastName,email\nA,B,a@b.de\n");
		await wrapper.find('[data-testid="csv-send-registration"] input').setValue(true);
		await wrapper.find('[data-testid="user-import-form"]').trigger("submit");
		await flushPromises();

		expect(api.importCsv).toHaveBeenCalledWith({
			schoolId: "school-1",
			role: "teacher",
			schoolYear: "y2",
			sendEmails: true,
			data: "firstName,lastName,email\nA,B,a@b.de\n",
		});
		const result = wrapper.find('[data-testid="csv-import-result"]');
		expect(result.text()).toContain("legacy.administration.controller.text.successfullyImportedUsers");
		expect(result.text()).toContain("legacy.administration.controller.text.errorImportingUsers");
	});

	it("does not import without a file", async () => {
		const { wrapper, api } = await setup("students", {});
		await wrapper.find('[data-testid="user-import-form"]').trigger("submit");
		await flushPromises();
		expect(api.importCsv).not.toHaveBeenCalled();
	});
});
