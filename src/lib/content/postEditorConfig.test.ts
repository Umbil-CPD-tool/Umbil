import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { POST_EDITOR_PLUGINS, POST_EDITOR_TOOLBAR_TOOLS } from "./postEditorConfig";

describe("blog post editor wiring", () => {
  it("registers every toolbar control shown in the admin editor", () => {
    const tools = new Set<string>(POST_EDITOR_TOOLBAR_TOOLS);
    for (const tool of [
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
    ]) {
      assert.equal(tools.has(tool), true, `missing toolbar tool ${tool}`);
    }
  });

  it("enables the plugins those toolbar controls need", () => {
    const plugins = new Set<string>(POST_EDITOR_PLUGINS);
    for (const plugin of [
      "headings",
      "lists",
      "link",
      "link-dialog",
      "code-block",
      "table",
      "thematic-break",
      "diff-source",
      "image",
    ]) {
      assert.equal(plugins.has(plugin), true, `missing plugin ${plugin}`);
    }
  });

  it("keeps the admin editor wired to those plugins", () => {
    const source = readFileSync(path.resolve("src/app/blog/admin/PostEditor.tsx"), "utf8");
    for (const token of [
      "linkDialogPlugin",
      "codeBlockPlugin",
      "headingsPlugin",
      "CreateLink",
      "InsertImage",
      "InsertTable",
      "InsertCodeBlock",
      "DiffSourceToggleWrapper",
      "BlockTypeSelect",
      "CodeToggle",
    ]) {
      assert.match(source, new RegExp(token), `PostEditor is missing ${token}`);
    }
  });
});
