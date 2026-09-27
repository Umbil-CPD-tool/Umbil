export const POST_EDITOR_TOOLBAR_TOOLS = [
  "undo-redo",
  "bold-italic-underline",
  "inline-code",
  "lists",
  "headings",
  "link",
  "image",
  "table",
  "divider",
  "code-block",
  "strike-sup-sub",
  "source",
] as const;

export const POST_EDITOR_PLUGINS = [
  "headings",
  "lists",
  "quote",
  "link",
  "link-dialog",
  "code-block",
  "table",
  "thematic-break",
  "markdown-shortcut",
  "diff-source",
  "image",
] as const;

export type PostEditorToolbarTool = (typeof POST_EDITOR_TOOLBAR_TOOLS)[number];
export type PostEditorPlugin = (typeof POST_EDITOR_PLUGINS)[number];
