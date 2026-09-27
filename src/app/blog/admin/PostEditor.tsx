"use client";

import { useMemo } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  codeBlockPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "post-covers";
const STORAGE_FOLDER = "covers";

async function uploadInlineImage(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${STORAGE_FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (uploadError || !uploadData) {
    throw uploadError ?? new Error("Image upload failed");
  }

  const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);
  if (!publicData?.publicUrl) {
    throw new Error("Unable to generate image URL");
  }

  return publicData.publicUrl;
}

type PostEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PostEditor({ value, onChange }: PostEditorProps) {
  const plugins = useMemo<MDXEditorProps["plugins"]>(() => [
    toolbarPlugin({
      toolbarContents: () => (
        <DiffSourceToggleWrapper>
          <UndoRedo />
          <Separator />
          <BoldItalicUnderlineToggles />
          <CodeToggle />
          <Separator />
          <ListsToggle />
          <BlockTypeSelect />
          <Separator />
          <CreateLink />
          <InsertImage />
          <InsertTable />
          <InsertThematicBreak />
          <InsertCodeBlock />
          <Separator />
          <StrikeThroughSupSubToggles />
        </DiffSourceToggleWrapper>
      ),
    }),
    headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
    tablePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
    imagePlugin({
      imageUploadHandler: async (file) => uploadInlineImage(file),
    }),
  ], []);

  return (
    <div className="blog-mdx-editor rounded-xl border border-slate-200 bg-white p-2 text-slate-900">
      <MDXEditor
        markdown={value}
        onChange={onChange}
        plugins={plugins}
        contentEditableClassName="min-h-[400px] prose max-w-none text-slate-900"
      />
    </div>
  );
}
