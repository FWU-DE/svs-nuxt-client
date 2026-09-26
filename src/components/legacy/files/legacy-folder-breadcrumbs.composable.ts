import { legacyFileStorageApi } from "@data-legacy-files";
import { Breadcrumb } from "@ui-layout";
import { computed, ComputedRef, Ref, ref, watch } from "vue";

/**
 * Breadcrumbs of a legacy file view: the fixed trail of the area (e.g. "Dateien
 * aus meinen Kursen › Mathe") followed by the chain of folders down to the one shown.
 */
export const useLegacyFolderBreadcrumbs = (
	folderId: Ref<string | undefined>,
	base: ComputedRef<Breadcrumb[]>,
	folderLink: (id: string) => string
): ComputedRef<Breadcrumb[]> => {
	const chain = ref<Breadcrumb[]>([]);

	watch(
		folderId,
		async (id) => {
			if (!id) {
				chain.value = [];
				return;
			}
			try {
				const folders = await legacyFileStorageApi.folderChain(id);
				chain.value = folders.map((folder) => ({ title: folder.name, to: folderLink(folder._id) }));
			} catch {
				chain.value = [];
			}
		},
		{ immediate: true }
	);

	return computed(() => {
		const all = [...base.value, ...chain.value];
		return all.map((crumb, index) => (index === all.length - 1 ? { ...crumb, to: undefined, disabled: true } : crumb));
	});
};
