import { isLegacyClient } from "../legacy-client-route.js";
import { isKnownLegacyViewPath } from "../legacy-view-migration";
import { NavigationGuard, RouteLocationNormalized } from "vue-router";

export const legacyCompatibilityGuard: NavigationGuard = (to: RouteLocationNormalized) => {
	if (!isLegacyClient(to.path)) {
		return true;
	}

	if (isKnownLegacyViewPath(to.path)) {
		return {
			path: "/legacy-view-migration",
			query: { path: to.fullPath },
			replace: true,
		};
	}

	window.location.assign(to.fullPath);
	return false;
};
