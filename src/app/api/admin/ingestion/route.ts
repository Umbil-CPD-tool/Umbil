// src/app/api/admin/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { generateEmbedding } from "@/lib/rag";
import { OpenAI } from "openai";
import { INGESTION_PROMPT } from "@/lib/prompts";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
// @ts-ignore (No types available for this plugin yet)
import { gfm } from "turndown-plugin-gfm";

const openai = new OpenAI();
const MODEL_SLUG = "gpt-4"; 

// Initialize HTML->Markdown converter
const turndownService = new TurndownService({ 
  headingStyle: "atx", 
  codeBlockStyle: "fenced" 
});
turndownService.use(gfm); // Add GitHub Flavored Markdown (Tables) support

async function scrapeUrlToMarkdown(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
  });
  if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);
  
  const html = await response.text();
  const $ = cheerio.load(html);

  // Clean up junk
  $("script").remove();
  $("style").remove();
  $("nav").remove();
  $("footer").remove();
  $(".ad").remove();
  $(".cookie-banner").remove();

  // Prefer main content if detected, else body
  const mainContent = $("main").length ? $("main").html() : $("body").html();
  
  if (!mainContent) throw new Error("Could not extract content from page");

  return turndownService.turndown(mainContent);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse Input
    const { text, url, source, preview } = await request.json();

    if (!source) {
      return NextResponse.json({ error: "Missing source name" }, { status: 400 });
    }

    let rawContent = text || "";

    // 2. SCRAPE MODE: If URL provided and text is empty
    if (url && !rawContent) {
        console.log(`[Ingest] Scraping URL: ${url}`);
        try {
            rawContent = await scrapeUrlToMarkdown(url);
        } catch (scrapeErr: any) {
            return NextResponse.json({ error: `Scraping failed: ${scrapeErr.message}` }, { status: 400 });
        }
    }

    if (!rawContent) {
        return NextResponse.json({ error: "No content provided (Text or URL required)" }, { status: 400 });
    }

    // 3. PREVIEW MODE: Rewrite but DO NOT SAVE
    if (preview) {
        console.log(`[Ingest] Generating Rewrite Preview for ${source}...`);
        
        const completion = await openai.chat.completions.create({
            model: MODEL_SLUG,
            messages: [
                { role: "system", content: INGESTION_PROMPT },
                { role: "user", content: rawContent }
            ],
            temperature: 0.3,
        });

        const rewrittenContent = completion.choices[0].message.content;

        if (!rewrittenContent) throw new Error("OpenAI returned no content");

        return NextResponse.json({
            success: true,
            rewrittenContent,
            message: "Draft generated. Please review."
        });
    }

    // 4. SAVE MODE: Content is explicitly approved by admin
    // In this mode, 'text' IS the rewritten/approved content from the UI
    console.log(`[Ingest] Saving approved content for ${source}...`);
    
    // a. Chunking
    const chunks = rawContent.split("\n\n").filter((c: string) => c.length > 50);

    // b. Embed & Store
    let chunksProcessed = 0;
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);

      await supabaseService.from("documents").insert({
        content: chunk,
        metadata: {
          source,
          url: url || null,
          type: "umbil_rewrite_original",
          original_ref: "Based on: " + source
        },
        embedding
      });
      chunksProcessed++;
    }

    return NextResponse.json({
      success: true,
      chunksProcessed,
      message: "Contents have been permanently stored in Knowledge Base."
    });

  } catch (err: any) {
    console.error("Ingest Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}