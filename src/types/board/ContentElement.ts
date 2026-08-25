import {
	CollaborativeTextEditorElementResponse,
	ContentElementType,
	DrawingElementResponse,
	ExternalToolElementResponse,
	FileElementResponse,
	FileFolderElementResponse,
	H5pElementResponse,
	LinkElementResponse,
	ChecklistElementResponse,
	CodeElementResponse,
	DeadlineElementResponse,
	FormulaElementResponse,
	ParentNodeInfoResponse,
	ParentNodeType,
	PollElementResponse,
	RichTextElementResponse,
	VideoConferenceElementResponse,
} from "@api-server";

export type FileFolderElement = FileFolderElementResponse;

export type AnyContentElement =
	| LinkElementResponse
	| RichTextElementResponse
	| FileElementResponse
	| FileFolderElementResponse
	| ExternalToolElementResponse
	| DrawingElementResponse
	| CollaborativeTextEditorElementResponse
	| VideoConferenceElementResponse
	| H5pElementResponse
	| PollElementResponse
	| DeadlineElementResponse
	| CodeElementResponse
	| FormulaElementResponse
	| ChecklistElementResponse;

export type ParentNodeInfo = ParentNodeInfoResponse;

export { ContentElementType, ParentNodeType };
