// src/app/api/admin/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { generateEmbedding } from "@/lib/rag";
import { OpenAI } from "openai";
import { INGESTION_PROMPT } from "@/lib/prompts";

const openai = new OpenAI();
const MODEL_SLUG = "gpt-4o"; 

// --- GET: List Recent Sources OR Get Source Content ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get("source");

    // A. FETCH CONTENT PREVIEW (If source is provided)
    if (sourceParam) {
        const { data, error } = await supabaseService
            .from("knowledge_base_chunks")
            .select("content")
            .eq("source", sourceParam)
            .limit(20); // Just get a sample to show the user

        if (error) throw error;

        const previewText = data?.map((d: any) => d.content).join("\n\n...[Next Chunk]...\n\n") || "";
        return NextResponse.json({ previewText, count: data?.length });
    }

    // B. LIST RECENT SOURCES (Default)
    // We fetch the last 500 chunks to find unique sources.
    const { data, error } = await supabaseService
        .from("knowledge_base_chunks")
        .select("source") // Select the top-level column directly
        .order("id", { ascending: false })
        .limit(500);

    if (error) throw error;

    // Extract unique source names
    const sources = new Set<string>();
    data?.forEach((doc: any) => {
        if (doc.source) sources.add(doc.source);
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

    // Delete from correct table using top-level column
    const { error, count } = await supabaseService
      .from("knowledge_base_chunks")
      .delete({ count: "exact" }) 
      .eq("source", source); // Use .eq for top-level column

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
    if (url && !rawContent) {
        console.log(`[Ingest] Attempting to scrape via Jina Reader: ${url}`);
        
        try {
            const scrapeRes = await fetch(`https://r.jina.ai/${url}`, {
                headers: { "X-Target-Selector": "body" }
            });

            if (!scrapeRes.ok) throw new Error(`Blocked by site (${scrapeRes.status}).`);

            const markdown = await scrapeRes.text();
            if (markdown.length < 50 || markdown.includes("Access Denied")) {
                 throw new Error("Site blocked the scraper.");
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
    
    // a. Chunking
    const chunks = rawContent.split("\n\n").filter((c: string) => c.length > 50);

    // b. Embed & Store
    let chunksProcessed = 0;
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);

      // Insert into correct table with explicit columns
      await supabaseService.from("knowledge_base_chunks").insert({
        content: chunk,
        source: source,
        document_type: "umbil_rewrite_original",
        original_ref: "Based on: " + source,
        url: url || null, // Only if your table has a 'url' column, otherwise remove this line
        embedding: embedding
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