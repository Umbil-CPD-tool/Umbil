// src/app/api/admin/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { generateEmbedding } from "@/lib/rag";
import { OpenAI } from "openai";
import { INGESTION_PROMPT } from "@/lib/prompts";

const openai = new OpenAI();
const MODEL_SLUG = "gpt-4o"; 

// --- GET: List Recent Sources (Helpful for finding what to delete) ---
export async function GET(request: NextRequest) {
  try {
    // We fetch the last 500 chunks to find unique sources.
    // (A scalable solution would use a Postgres RPC 'get_unique_sources', but this works for now)
    const { data, error } = await supabaseService
        .from("documents")
        .select("metadata")
        .order("id", { ascending: false })
        .limit(500);

    if (error) throw error;

    // Extract unique source names
    const sources = new Set<string>();
    data?.forEach((doc: any) => {
        if (doc.metadata?.source) sources.add(doc.metadata.source);
    });

    return NextResponse.json({ sources: Array.from(sources) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- DELETE: Remove a Source ---
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");

    if (!source) {
      return NextResponse.json({ error: "Missing source name" }, { status: 400 });
    }

    console.log(`[Admin] Deleting all chunks for source: ${source}`);

    // Delete where metadata->>source == source
    const { error, count } = await supabaseService
      .from("documents")
      .delete({ count: "exact" }) 
      .filter("metadata->>source", "eq", source);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `Successfully deleted ${count} chunks for "${source}".`
    });

  } catch (err: any) {
    console.error("Delete Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- POST: Ingest / Rewrite ---
export async function POST(request: NextRequest) {
  try {
    const { text, url, source, preview } = await request.json();

    if (!source) {
      return NextResponse.json({ error: "Missing source name" }, { status: 400 });
    }

    let rawContent = text || "";

    // --- 1. SMART SCRAPER (via Jina Reader) ---
    // If URL is provided but text is empty, try to fetch via Jina.
    if (url && !rawContent) {
        console.log(`[Ingest] Attempting to scrape via Jina Reader: ${url}`);
        
        try {
            // We prepend 'https://r.jina.ai/' to the URL.
            // This service converts the web page to Markdown for us.
            const scrapeRes = await fetch(`https://r.jina.ai/${url}`, {
                headers: {
                    // Optional: Tells Jina we want raw content
                    "X-Target-Selector": "body", 
                }
            });

            if (!scrapeRes.ok) {
                // If 403/Forbidden, throw specific error
                throw new Error(`Blocked by site (${scrapeRes.status}). Please copy-paste text manually.`);
            }

            const markdown = await scrapeRes.text();

            // Sanity check: If the result is basically empty or an error message
            if (markdown.length < 50 || markdown.includes("Access Denied")) {
                 throw new Error("Site blocked the scraper. Please copy-paste text manually.");
            }

            rawContent = markdown;

        } catch (scrapeErr: any) {
            console.error("Scrape failed:", scrapeErr);
            return NextResponse.json({ 
                error: `⚠️ Auto-scrape failed: ${scrapeErr.message}. \n\n👉 PLEASE PASTE THE TEXT MANUALLY.` 
            }, { status: 400 });
        }
    }

    if (!rawContent) {
        return NextResponse.json({ error: "No content provided (Text or URL required)" }, { status: 400 });
    }

    // --- 2. PREVIEW MODE (Rewrite Draft) ---
    if (preview) {
        console.log(`[Ingest] Generating Rewrite Preview for ${source}...`);
        
        const completion = await openai.chat.completions.create({
            model: MODEL_SLUG,
            messages: [
                { role: "system", content: INGESTION_PROMPT },
                { role: "user", content: rawContent }
            ],
            temperature: 0.1,
        });

        const rewrittenContent = completion.choices[0].message.content;

        if (!rewrittenContent) throw new Error("OpenAI returned no content");

        return NextResponse.json({
            success: true,
            rewrittenContent,
            message: "Draft generated. Please review."
        });
    }

    // --- 3. SAVE MODE (Store in DB) ---
    console.log(`[Ingest] Saving approved content for ${source}...`);
    
    // a. Chunking (Split by double newlines)
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