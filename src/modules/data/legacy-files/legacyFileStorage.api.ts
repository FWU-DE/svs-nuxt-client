import { $axios } from "@/utils/api";

/**
 * Client for the legacy file service (`/v1/fileStorage`, `/v1/files`) that the
 * product's "Dateien" pages use: folders, personal, course and team files,
 * files shared with me. It is not part of the generated OpenAPI clients.
 */

export type LegacyOwnerModel = "user" | "course" | "teams";

export type LegacySecurityStatus = "pending" | "verified" | "blocked" | "wont-check";

export interface LegacyFilePermission {
	refId: string;
	refPermModel?: "user" | "role" | "";
	read?: boolean;
	write?: boolean;
	create?: boolean;
	delete?: boolean;
}

export interface LegacyFile {
	_id: string;
	name: string;
	isDirectory: boolean;
	size?: number;
	type?: string;
	owner: string;
	refOwnerModel: LegacyOwnerModel;
	parent?: string;
	creator?: string;
	permissions: LegacyFilePermission[];
	shareTokens?: string[];
	securityCheck?: { status: LegacySecurityStatus; reason?: string };
	createdAt: string;
	updatedAt: string;
}

/** An entry of the permission dialog; a flag the user may not change is absent. */
export interface LegacyPermissionEntry {
	refId: string;
	name: string;
	read?: boolean;
	write?: boolean;
}

export interface LegacyTeam {
	_id: string;
	name: string;
}

interface SignedUpload {
	url: string;
	header: Record<string, string>;
}

/**
 * Some legacy services *return* a Feathers error with a success status instead
 * of throwing it (e.g. a forbidden move). Treat such a body as the error it is.
 */
export class LegacyReturnedError extends Error {
	constructor(
		public readonly code: number,
		message: string
	) {
		super(message);
	}
}

const failIfReturnedError = <T>(data: T): T => {
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const body = data as { code?: unknown; className?: unknown; message?: unknown };
		if (typeof body.code === "number" && body.code >= 400 && typeof body.className === "string") {
			throw new LegacyReturnedError(body.code, String(body.message ?? ""));
		}
	}
	return data;
};

const newShareToken = () => {
	const bytes = new Uint8Array(9);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
		.join("")
		.slice(0, 12);
};

export const legacyFileStorageApi = {
	/** Files and folders of an owner (personal files: no owner) in a folder (root: no parent). */
	async list(owner?: string, parent?: string): Promise<LegacyFile[]> {
		const { data } = await $axios.get<LegacyFile[]>("/v1/fileStorage", { params: { owner, parent } });
		return failIfReturnedError(data);
	},

	async get(id: string): Promise<LegacyFile> {
		const { data } = await $axios.get<LegacyFile>(`/v1/files/${id}`);
		return data;
	},

	/** The folder and its ancestors, root first, for the breadcrumbs. */
	async folderChain(id: string): Promise<LegacyFile[]> {
		const chain: LegacyFile[] = [];
		let current: string | undefined = id;
		while (current && chain.length < 50) {
			const folder = await legacyFileStorageApi.get(current);
			chain.unshift(folder);
			current = folder.parent;
		}
		return chain;
	},

	async createDirectory(name: string, owner?: string, parent?: string): Promise<LegacyFile> {
		const { data } = await $axios.post<LegacyFile>("/v1/fileStorage/directories", { name, owner, parent });
		return failIfReturnedError(data);
	},

	/** Upload in the three steps of the product: signed URL, PUT of the bytes, metadata record. */
	async upload(file: File, owner?: string, parent?: string): Promise<LegacyFile> {
		const fileType = file.type || "application/octet-stream";
		const { data: signed } = await $axios.post<SignedUpload>("/v1/fileStorage/signedUrl", {
			filename: file.name,
			fileType,
			parent,
		});
		const put = await fetch(signed.url, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": signed.header["Content-Type"] || fileType },
		});
		if (!put.ok) {
			throw new Error(`upload failed with status ${put.status}`);
		}
		const { data } = await $axios.post<LegacyFile>("/v1/fileStorage", {
			name: file.name,
			owner,
			parent,
			type: fileType,
			size: file.size,
			storageFileName: decodeURIComponent(signed.header["x-amz-meta-flat-name"]),
			thumbnail: "",
		});
		return data;
	},

	async rename(item: LegacyFile, newName: string): Promise<void> {
		const path = item.isDirectory ? "/v1/fileStorage/directories/rename" : "/v1/fileStorage/rename";
		const { data } = await $axios.post(path, { id: item._id, newName });
		failIfReturnedError(data);
	},

	async remove(item: LegacyFile): Promise<void> {
		const path = item.isDirectory ? "/v1/fileStorage/directories" : "/v1/fileStorage";
		await $axios.delete(path, { params: { _id: item._id } });
	},

	/** Moves into a folder, or to a root: the user's id (personal files), a course or a team id. */
	async move(item: LegacyFile, parent: string): Promise<void> {
		const { data } = await $axios.patch(`/v1/fileStorage/${item._id}`, { parent });
		failIfReturnedError(data);
	},

	/** The URL to open (`download: false`) or download a file. */
	async signedUrl(item: LegacyFile, download: boolean, name = item.name): Promise<string> {
		const { data } = await $axios.get<{ url: string }>("/v1/fileStorage/signedUrl", {
			params: { file: item._id, name, download },
		});
		return failIfReturnedError(data).url;
	},

	/** The share token of a file; creates one if sharing is not enabled yet. */
	async shareToken(item: LegacyFile): Promise<string> {
		const current = await legacyFileStorageApi.get(item._id);
		if (current.shareTokens?.length) {
			return current.shareTokens[0];
		}
		const token = newShareToken();
		await $axios.patch(`/v1/fileStorage/shared/${item._id}`, { shareToken: token });
		return token;
	},

	/** Grants the current user read access to a file shared by link. */
	async registerShare(fileId: string, shareToken: string): Promise<LegacyFile> {
		const { data } = await $axios.patch<LegacyFile>(`/v1/files/${fileId}`, {}, { params: { shareToken } });
		return data;
	},

	async permissions(fileId: string): Promise<LegacyPermissionEntry[]> {
		const { data } = await $axios.get<LegacyPermissionEntry[]>("/v1/fileStorage/permission", {
			params: { file: fileId },
		});
		return failIfReturnedError(data);
	},

	async updatePermissions(fileId: string, permissions: Array<Pick<LegacyFilePermission, "refId" | "read" | "write">>) {
		const { data } = await $axios.patch(`/v1/fileStorage/permission/${fileId}`, { permissions });
		failIfReturnedError(data);
	},

	/** Files other users shared with me, read-only (`/files/shared` of the product). */
	async sharedWithMe(userId: string): Promise<LegacyFile[]> {
		const { data } = await $axios.get<{ data: LegacyFile[] }>("/v1/files", {
			params: { "permissions.refId": userId, "permissions.refPermModel": "user", "creator[$ne]": userId },
		});
		return data.data.filter((file) => {
			const permission = file.permissions.find((p) => p.refId === userId);
			return permission ? !permission.write : false;
		});
	},

	async myTeams(): Promise<LegacyTeam[]> {
		const { data } = await $axios.get<{ data: LegacyTeam[] }>("/v1/teams");
		return data.data;
	},

	async team(id: string): Promise<LegacyTeam> {
		const { data } = await $axios.get<LegacyTeam>(`/v1/teams/${id}`);
		return data;
	},
};
