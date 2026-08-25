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

	// the browser is already here, assigning the same address again would reload for ever
	if (window.location.pathname === to.path) {
		return true;
	}

	window.location.assign(to.fullPath);
	return false;
};
