import { legacyCompatibilityGuard } from "./legacy-route-compatibility.guard";
import { RouteLocationNormalized } from "vue-router";

const assignMock = vi.fn();

vi.stubGlobal("location", {
	assign: assignMock,
});

describe("legacyCompatibilityGuard", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	const route = (path: string, fullPath = path): RouteLocationNormalized =>
		({ path, fullPath }) as RouteLocationNormalized;

	it("allows Vue client routes", () => {
		const result = legacyCompatibilityGuard(route("/dashboard"), route("/"), vi.fn());

		expect(result).toBe(true);
		expect(assignMock).not.toHaveBeenCalled();
	});

	it("routes known legacy views to the Nuxt migration page", () => {
		const result = legacyCompatibilityGuard(route("/teams", "/teams?activeTab=events"), route("/"), vi.fn());

		expect(result).toEqual({
			path: "/legacy-view-migration",
			query: { path: "/teams?activeTab=events" },
			replace: true,
		});
		expect(assignMock).not.toHaveBeenCalled();
	});

	it("keeps forwarding unknown legacy paths to the legacy client", () => {
		const result = legacyCompatibilityGuard(route("/unknown-legacy", "/unknown-legacy?x=1"), route("/"), vi.fn());

		expect(result).toBe(false);
		expect(assignMock).toHaveBeenCalledWith("/unknown-legacy?x=1");
	});
});
