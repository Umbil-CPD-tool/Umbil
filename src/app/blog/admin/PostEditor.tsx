"use client";

import { useMemo } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
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
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
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
  const editorRef = useMemo(() => ({ current: null as MDXEditorMethods | null }), []);

  const plugins = useMemo<MDXEditorProps["plugins"]>(() => [
    toolbarPlugin({
      toolbarContents: () => (
        <>
          <UndoRedo />
          <Separator />
          <BoldItalicUnderlineToggles />
          <ListsToggle />
          <BlockTypeSelect />
          <CreateLink />
          <InsertCodeBlock />
          <InsertImage />
          <InsertTable />
          <InsertThematicBreak />
          <Separator />
          <StrikeThroughSupSubToggles />
          <DiffSourceToggleWrapper>
            <></>
          </DiffSourceToggleWrapper>
        </>
      ),
    }),
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    codeBlockPlugin(),
    tablePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    diffSourcePlugin({ viewMode: "rich-text" }),
    directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
    imagePlugin({
      imageUploadHandler: async (file) => {
        const url = await uploadInlineImage(file);
        return url;
      },
    }),
  ], []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <MDXEditor
        ref={editorRef as any}
        markdown={value}
        onChange={onChange}
        plugins={plugins}
        contentEditableClassName="min-h-[400px]"
      />
    </div>
  );
}
