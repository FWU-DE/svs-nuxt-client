import { $axios } from "@/utils/api";

/**
 * Courses, course groups and topics over the old API (`/v1/courses`, `/v1/courseGroups`,
 * `/v1/lessons`) and the topic read of `/v3/lessons`, as the product's course pages use them.
 * These services are not part of the generated OpenAPI clients.
 */

export type LegacyPerson = { _id: string; firstName: string; lastName: string; outdatedSince?: string };

export type LegacyCourseTime = {
	_id?: string;
	weekday: number;
	startTime?: number;
	duration?: number;
	room?: string;
};

export type LegacyCourseDetails = {
	_id: string;
	name: string;
	description?: string;
	color: string;
	schoolId: string;
	teacherIds: string[];
	substitutionIds: string[];
	userIds: string[];
	classIds: string[];
	groupIds?: string[];
	startDate?: string;
	untilDate?: string;
	times: LegacyCourseTime[];
	features?: string[];
	syncedWithGroup?: string;
	isArchived?: boolean;
};

export type LegacyCourseInput = Partial<
	Pick<
		LegacyCourseDetails,
		| "name"
		| "description"
		| "color"
		| "teacherIds"
		| "substitutionIds"
		| "userIds"
		| "classIds"
		| "startDate"
		| "untilDate"
		| "times"
		| "features"
	>
>;

export type LegacyCourseGroup = {
	_id: string;
	name: string;
	courseId: string;
	schoolId: string;
	userIds: string[];
};

export type LegacyCourseGroupPopulated = Omit<LegacyCourseGroup, "userIds"> & { userIds: LegacyPerson[] };

export type LessonContent = {
	_id?: string;
	component: string;
	title?: string;
	hidden?: boolean;
	content?: Record<string, unknown>;
};

export type Lesson = {
	_id: string;
	name: string;
	courseId?: string;
	courseGroupId?: string;
	hidden: boolean;
	position: number;
	contents: LessonContent[];
	materials: { _id: string; title: string; url?: string; client?: string }[];
};

export type LessonInput = {
	name: string;
	courseId?: string;
	courseGroupId?: string;
	hidden?: boolean;
	contents: LessonContent[];
};

export type LegacyGroupTask = {
	_id: string;
	name: string;
	description?: string;
	dueDate?: string;
	availableDate: string;
	private?: boolean;
	teamSubmissions?: boolean;
	maxTeamMembers?: number | null;
	lessonId?: string;
};

export type LegacyGroupSubmission = {
	_id: string;
	updatedAt: string;
	homeworkId: { _id: string; name: string; description?: string };
};

type Page<T> = { total: number; limit?: number; skip: number; data: T[] };

/** The v3 ids of a lesson content come as ObjectId buffers; the editor needs none of them. */
const plainContent = (content: LessonContent): LessonContent => ({
	component: content.component,
	title: content.title,
	hidden: content.hidden,
	content: content.content,
});

export const useLegacyCourseApi = () => {
	const getCourse = async (id: string): Promise<LegacyCourseDetails> => {
		const { data } = await $axios.get<LegacyCourseDetails>(`/v1/courses/${id}`);
		return data;
	};

	const getCourseWithPeople = async (
		id: string,
		paths: ("userIds" | "teacherIds")[]
	): Promise<Omit<LegacyCourseDetails, "userIds" | "teacherIds"> & Record<string, unknown>> => {
		const { data } = await $axios.get(`/v1/courses/${id}`, { params: { $populate: paths } });
		return data;
	};

	const createCourse = async (input: LegacyCourseInput): Promise<LegacyCourseDetails> => {
		const { data } = await $axios.post<LegacyCourseDetails>("/v1/courses", input);
		return data;
	};

	const updateCourse = async (id: string, input: LegacyCourseInput): Promise<LegacyCourseDetails> => {
		const { data } = await $axios.patch<LegacyCourseDetails>(`/v1/courses/${id}`, input);
		return data;
	};

	const deleteCourse = async (id: string): Promise<void> => {
		await $axios.delete(`/v1/courses/${id}`);
	};

	const findGroups = async (courseId: string): Promise<LegacyCourseGroupPopulated[]> => {
		const { data } = await $axios.get<Page<LegacyCourseGroupPopulated>>("/v1/courseGroups", {
			params: { courseId, $populate: ["userIds"], $limit: false },
		});
		return data.data;
	};

	const getGroup = async (id: string): Promise<LegacyCourseGroupPopulated> => {
		const { data } = await $axios.get<LegacyCourseGroupPopulated>(`/v1/courseGroups/${id}`, {
			params: { $populate: ["userIds"] },
		});
		return data;
	};

	const createGroup = async (input: {
		name: string;
		courseId: string;
		userIds: string[];
	}): Promise<LegacyCourseGroup> => {
		const { data } = await $axios.post<LegacyCourseGroup>("/v1/courseGroups", input);
		return data;
	};

	const updateGroup = async (id: string, input: { name: string; userIds: string[] }): Promise<LegacyCourseGroup> => {
		const { data } = await $axios.patch<LegacyCourseGroup>(`/v1/courseGroups/${id}`, input);
		return data;
	};

	const deleteGroup = async (id: string): Promise<void> => {
		await $axios.delete(`/v1/courseGroups/${id}`);
	};

	const getLesson = async (id: string): Promise<Lesson> => {
		const { data } = await $axios.get<Lesson>(`/v3/lessons/${id}`);
		return data;
	};

	const findGroupLessons = async (courseGroupId: string): Promise<Lesson[]> => {
		const { data } = await $axios.get<Page<Lesson>>("/v1/lessons", { params: { courseGroupId, $sort: "position" } });
		return data.data;
	};

	const createLesson = async (input: LessonInput): Promise<Lesson> => {
		const { data } = await $axios.post<Lesson>("/v1/lessons", { ...input, contents: input.contents.map(plainContent) });
		return data;
	};

	const updateLesson = async (id: string, input: Partial<LessonInput>): Promise<Lesson> => {
		const body = input.contents ? { ...input, contents: input.contents.map(plainContent) } : input;
		const { data } = await $axios.patch<Lesson>(`/v1/lessons/${id}`, body);
		return data;
	};

	const deleteLesson = async (id: string): Promise<void> => {
		await $axios.delete(`/v3/lessons/${id}`);
	};

	const findTasks = async (params: Record<string, unknown>): Promise<LegacyGroupTask[]> => {
		const { data } = await $axios.get<Page<LegacyGroupTask>>("/v1/homework", { params });
		return data.data;
	};

	const findGroupSubmissions = async (courseGroupId: string): Promise<LegacyGroupSubmission[]> => {
		const { data } = await $axios.get<Page<LegacyGroupSubmission>>("/v1/submissions", {
			params: { courseGroupId, $populate: ["homeworkId"] },
		});
		return data.data;
	};

	return {
		getCourse,
		getCourseWithPeople,
		createCourse,
		updateCourse,
		deleteCourse,
		findGroups,
		getGroup,
		createGroup,
		updateGroup,
		deleteGroup,
		getLesson,
		findGroupLessons,
		createLesson,
		updateLesson,
		deleteLesson,
		findTasks,
		findGroupSubmissions,
	};
};
