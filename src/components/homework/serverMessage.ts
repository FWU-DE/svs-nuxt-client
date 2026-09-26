import { isAxiosError } from "axios";

/** The message the old API sends with a refused request (e.g. "Die Aufgabe wurde bereits abgegeben!"). */
export const serverMessage = (error: unknown): string | undefined => {
	if (!isAxiosError(error)) return undefined;
	const message = (error.response?.data as { message?: unknown } | undefined)?.message;
	return typeof message === "string" && message.length > 0 ? message : undefined;
};
