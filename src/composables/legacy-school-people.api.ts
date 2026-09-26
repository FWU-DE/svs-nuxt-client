import { $axios } from "@/utils/api";

/**
 * Teachers, students and classes of the own school as the legacy course and class forms
 * offer them for selection: the admin user lists (`/v3/users/admin/...`) and `/v1/classes`.
 */

export type SchoolPerson = { _id: string; firstName: string; lastName: string; outdatedSince?: string };

export type LegacyClass = {
	_id: string;
	name?: string;
	displayName?: string;
	gradeLevel?: number;
	year?: string;
	schoolId: string;
	teacherIds: string[];
	userIds: string[];
	successor?: string;
};

type Page<T> = { total: number; data: T[] };

export const personName = (person: SchoolPerson) =>
	`${person.lastName}, ${person.firstName}${person.outdatedSince ? " ~~" : ""}`;

export const useLegacySchoolPeopleApi = () => {
	const listUsers = async (kind: "teachers" | "students"): Promise<SchoolPerson[]> => {
		const { data } = await $axios.get<Page<SchoolPerson>>(`/v3/users/admin/${kind}`, {
			params: { $limit: 1000, $sort: { lastName: 1 } },
		});
		return data.data;
	};

	const listClasses = async (): Promise<LegacyClass[]> => {
		const { data } = await $axios.get<LegacyClass[]>("/v1/classes", { params: { $limit: -1 } });
		return data;
	};

	return { listUsers, listClasses };
};
