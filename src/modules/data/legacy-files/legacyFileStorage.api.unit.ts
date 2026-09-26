import { LegacyFile, legacyFileStorageApi, LegacyReturnedError } from "./legacyFileStorage.api";
import { initializeAxios } from "@/utils/api";
import { mockAxiosInstance } from "@@/tests/test-utils";
import { AxiosInstance } from "axios";
import { Mocked } from "vitest";

const legacyFile = (overrides: Partial<LegacyFile> = {}): LegacyFile => ({
	_id: "f1",
	name: "Arbeitsblatt.pdf",
	isDirectory: false,
	size: 10,
	type: "application/pdf",
	owner: "u1",
	refOwnerModel: "user",
	permissions: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-02T00:00:00.000Z",
	...overrides,
});

describe("legacyFileStorageApi", () => {
	let axiosMock: Mocked<AxiosInstance>;

	beforeEach(() => {
		axiosMock = mockAxiosInstance();
		initializeAxios(axiosMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("lists an owner's folder", async () => {
		axiosMock.get.mockResolvedValue({ data: [legacyFile()] });

		const files = await legacyFileStorageApi.list("course-1", "dir-1");

		expect(axiosMock.get).toHaveBeenCalledWith("/v1/fileStorage", { params: { owner: "course-1", parent: "dir-1" } });
		expect(files).toHaveLength(1);
	});

	it("treats an error the service returned with a success status as an error", async () => {
		axiosMock.patch.mockResolvedValue({
			data: { name: "Forbidden", message: "Error", code: 403, className: "forbidden", errors: {} },
		});

		await expect(legacyFileStorageApi.move(legacyFile(), "dir-2")).rejects.toBeInstanceOf(LegacyReturnedError);
	});

	it("uploads in three steps: signed URL, PUT of the bytes, metadata", async () => {
		axiosMock.post
			.mockResolvedValueOnce({
				data: {
					url: "/api/v1/fileStorage/blob/token",
					header: { "Content-Type": "text/plain", "x-amz-meta-flat-name": "1-%C3%BCbung.txt" },
				},
			})
			.mockResolvedValueOnce({ data: legacyFile({ name: "Übung.txt" }) });
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal("fetch", fetchMock);
		const file = new File(["Hallo"], "Übung.txt", { type: "text/plain" });

		await legacyFileStorageApi.upload(file, undefined, "dir-1");

		expect(axiosMock.post).toHaveBeenNthCalledWith(1, "/v1/fileStorage/signedUrl", {
			filename: "Übung.txt",
			fileType: "text/plain",
			parent: "dir-1",
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/v1/fileStorage/blob/token",
			expect.objectContaining({ method: "PUT" })
		);
		expect(axiosMock.post).toHaveBeenNthCalledWith(
			2,
			"/v1/fileStorage",
			expect.objectContaining({ name: "Übung.txt", parent: "dir-1", size: 5, storageFileName: "1-übung.txt" })
		);
	});

	it("keeps only read-only shares in the files shared with me", async () => {
		axiosMock.get.mockResolvedValue({
			data: {
				data: [
					legacyFile({ _id: "a", permissions: [{ refId: "me", read: true, write: false }] }),
					legacyFile({ _id: "b", permissions: [{ refId: "me", read: true, write: true }] }),
				],
			},
		});

		const shared = await legacyFileStorageApi.sharedWithMe("me");

		expect(shared.map((f) => f._id)).toEqual(["a"]);
	});

	it("reuses an existing share token and creates one otherwise", async () => {
		axiosMock.get.mockResolvedValueOnce({ data: legacyFile({ shareTokens: ["tok"] }) });
		expect(await legacyFileStorageApi.shareToken(legacyFile())).toBe("tok");

		axiosMock.get.mockResolvedValueOnce({ data: legacyFile({ shareTokens: [] }) });
		axiosMock.patch.mockResolvedValueOnce({ data: legacyFile() });
		const token = await legacyFileStorageApi.shareToken(legacyFile());
		expect(token).toMatch(/^[a-z0-9]{12}$/);
		expect(axiosMock.patch).toHaveBeenCalledWith("/v1/fileStorage/shared/f1", { shareToken: token });
	});

	it("builds the folder chain from the root down", async () => {
		axiosMock.get
			.mockResolvedValueOnce({ data: legacyFile({ _id: "child", name: "Kind", isDirectory: true, parent: "root" }) })
			.mockResolvedValueOnce({ data: legacyFile({ _id: "root", name: "Wurzel", isDirectory: true }) });

		const chain = await legacyFileStorageApi.folderChain("child");

		expect(chain.map((f) => f.name)).toEqual(["Wurzel", "Kind"]);
	});
});
