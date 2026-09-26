import { $axios } from "@/utils/api";

/**
 * Tasks and submissions over the old API (`/v1/homework`, `/v1/submissions`), as the
 * product's task pages use them. Deleting and archiving go through the v3 task routes.
 * These services are not part of the generated OpenAPI clients.
 */

export type LegacyUser = { _id: string; firstName: string; lastName: string; schoolId?: string };

export type LegacyCourse = {
	_id: string;
	name: string;
	color?: string;
	teacherIds: string[];
	substitutionIds?: string[];
	userIds: string[];
};

export type LegacyTaskStats = {
	userCount: number;
	submissionCount: number;
	submissionPercentage?: string;
	gradeCount: number;
	gradePercentage?: string;
	averageGrade?: string;
};

export type LegacyTask = {
	_id: string;
	name: string;
	description?: string;
	schoolId: string;
	teacherId: string;
	courseId: LegacyCourse | null;
	lessonId?: string | null;
	lessonName?: string;
	lessonHidden?: boolean;
	availableDate: string;
	dueDate?: string | null;
	private?: boolean;
	publicSubmissions?: boolean;
	teamSubmissions?: boolean;
	maxTeamMembers?: number | null;
	archived: string[];
	isTeacher?: boolean;
	stats?: LegacyTaskStats;
	grade?: string;
	hasEvaluation?: boolean;
	submissions?: number;
};

export type LegacyTaskInput = {
	name: string;
	description?: string;
	courseId?: string | null;
	lessonId?: string | null;
	availableDate: string;
	dueDate?: string | null;
	private?: boolean;
	publicSubmissions?: boolean;
	teamSubmissions?: boolean;
	maxTeamMembers?: number | null;
};

export type LegacySubmission = {
	_id: string;
	homeworkId: string;
	schoolId: string;
	studentId: string | LegacyUser;
	teamMembers: (string | LegacyUser)[];
	comment?: string;
	submitted: boolean;
	graded: boolean;
	grade?: number;
	gradeComment?: string;
	createdAt: string;
	updatedAt: string;
};

export type LegacySubmissionInput = Partial<
	Pick<LegacySubmission, "comment" | "submitted" | "graded" | "grade" | "gradeComment">
> & {
	homeworkId?: string;
	schoolId?: string;
	studentId?: string;
	teamMembers?: string[];
};

type Page<T> = { total: number; limit: number; skip: number; data: T[] };

export const idOf = (value: string | { _id: string } | null | undefined): string | undefined =>
	typeof value === "string" ? value : value?._id;

export const useLegacyHomeworkApi = () => {
	const getTask = async (id: string): Promise<LegacyTask> => {
		const { data } = await $axios.get<LegacyTask>(`/v1/homework/${id}`, { params: { $populate: ["courseId"] } });
		return data;
	};

	const createTask = async (input: LegacyTaskInput): Promise<LegacyTask> => {
		const { data } = await $axios.post<LegacyTask>("/v1/homework", input);
		return data;
	};

	const updateTask = async (
		id: string,
		input: Partial<LegacyTaskInput> | { archived: string[] }
	): Promise<LegacyTask> => {
		const { data } = await $axios.patch<LegacyTask>(`/v1/homework/${id}`, input);
		return data;
	};

	const deleteTask = async (id: string): Promise<void> => {
		await $axios.delete(`/v3/tasks/${id}`);
	};

	const findSubmissions = async (taskId: string): Promise<LegacySubmission[]> => {
		const { data } = await $axios.get<Page<LegacySubmission>>("/v1/submissions", {
			params: { homeworkId: taskId, $populate: ["studentId", "teamMembers"] },
		});
		return data.data;
	};

	const createSubmission = async (input: LegacySubmissionInput): Promise<LegacySubmission> => {
		const { data } = await $axios.post<LegacySubmission>("/v1/submissions", input);
		return data;
	};

	const updateSubmission = async (id: string, input: LegacySubmissionInput): Promise<LegacySubmission> => {
		const { data } = await $axios.patch<LegacySubmission>(`/v1/submissions/${id}`, input);
		return data;
	};

	const deleteSubmission = async (id: string): Promise<void> => {
		await $axios.delete(`/v3/submissions/${id}`);
	};

	/** Course with its students' names, for team members and the teacher's submission list. */
	const getCourseWithStudents = async (courseId: string): Promise<{ _id: string; userIds: LegacyUser[] }> => {
		const { data } = await $axios.get<{ _id: string; userIds: LegacyUser[] }>(`/v1/courses/${courseId}`, {
			params: { $populate: ["userIds"] },
		});
		return data;
	};

	return {
		getTask,
		createTask,
		updateTask,
		deleteTask,
		findSubmissions,
		createSubmission,
		updateSubmission,
		deleteSubmission,
		getCourseWithStudents,
	};
};
