import {
	ChecklistElementResponse,
	CodeElementResponse,
	CollaborativeTextEditorElementResponse,
	ContentElementType,
	DeadlineElementResponse,
	DrawingElementResponse,
	ExternalToolElementResponse,
	FileElementResponse,
	FileFolderElementResponse,
	FormulaElementResponse,
	H5pElementResponse,
	LinkElementResponse,
	ParentNodeInfoResponse,
	ParentNodeType,
	PollElementResponse,
	RecordingElementResponse,
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
	| ChecklistElementResponse
	| RecordingElementResponse;

export type ParentNodeInfo = ParentNodeInfoResponse;

export { ContentElementType, ParentNodeType };
