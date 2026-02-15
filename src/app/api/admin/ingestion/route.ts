// src/app/api/admin/ingestion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { generateEmbedding } from "@/lib/rag";
import { OpenAI } from "openai";
import { INGESTION_PROMPT } from "@/lib/prompts";

// Standard OpenAI client for Text Generation (GPT-4o)
const openai = new OpenAI();
const MODEL_SLUG = "gpt-4o"; 

// --- GET: List Recent Sources OR Get Source Content ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get("source");

    // 1. If requesting specific content chunks
    if (sourceParam) {
        const { data, error } = await supabaseService
            .from("knowledge_base_chunks")
            .select("content")
            .eq("source", sourceParam)
            .limit(20);

        if (error) throw error;

        const previewText = data?.map((d: any) => d.content).join("\n\n...[Next Chunk]...\n\n") || "";
        return NextResponse.json({ previewText, count: data?.length });
    }

    // 2. If listing sources (Use the summary table for speed)
    // We try querying the summary table first. If empty, fallback to distinct chunks.
    const { data: summaryData, error: summaryError } = await supabaseService
        .from("chunks_by_document")
        .select("source, chunk_count, total_chars, first_ingested")
        .order("first_ingested", { ascending: false })
        .limit(100);

    if (!summaryError && summaryData && summaryData.length > 0) {
        const sources = summaryData.map((d: any) => d.source);
        return NextResponse.json({ sources });
    }

    // Fallback: Query huge chunks table if summary table is empty
    const { data, error } = await supabaseService
        .from("knowledge_base_chunks")
        .select("source")
        .order("id", { ascending: false })
        .limit(500);

    if (error) throw error;

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

    // 1. Delete the Chunks
    const { error: chunkError, count } = await supabaseService
      .from("knowledge_base_chunks")
      .delete({ count: "exact" }) 
      .eq("source", source);

    if (chunkError) throw chunkError;

    // 2. Delete the Summary Record
    await supabaseService
      .from("chunks_by_document")
      .delete()
      .eq("source", source);

    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `Successfully deleted ${count} chunks for "${source}".`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- POST: Ingest / Rewrite ---
export async function POST(request: NextRequest) {
  try {
    const { text, url, source, preview, skipRewrite } = await request.json();

    if (!source) {
      return NextResponse.json({ error: "Missing source name" }, { status: 400 });
    }

    let rawContent = text || "";

    // 1. SMART SCRAPER
    if (url && !rawContent) {
        try {
            const scrapeRes = await fetch(`https://r.jina.ai/${url}`, {
                headers: { "X-Target-Selector": "body" }
            });
            if (!scrapeRes.ok) throw new Error(`Blocked by site (${scrapeRes.status}).`);
            const markdown = await scrapeRes.text();
            rawContent = markdown;
        } catch (scrapeErr: any) {
            return NextResponse.json({ 
                error: `⚠️ Auto-scrape failed: ${scrapeErr.message}.` 
            }, { status: 400 });
        }
    }

    if (!rawContent) {
        return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    // 2. REWRITE LOGIC (Skip if skipRewrite is true)
    let processedContent = rawContent;
    if (!skipRewrite) {
        if (preview || !skipRewrite) {
            const completion = await openai.chat.completions.create({
                model: MODEL_SLUG,
                messages: [
                    { role: "system", content: INGESTION_PROMPT },
                    { role: "user", content: rawContent }
                ],
                temperature: 0.1,
            });
            processedContent = completion.choices[0].message.content || rawContent;
            
            if (preview) {
                return NextResponse.json({
                    success: true,
                    rewrittenContent: processedContent,
                    message: "Draft generated. Please review."
                });
            }
        }
    }

    // 3. SAVE MODE
    // Split by double newlines to get rough paragraphs
    const chunks = processedContent.split("\n\n").filter((c: string) => c.length > 50);
    let chunksProcessed = 0;
    const docType = skipRewrite ? "manual_ingest" : "umbil_rewrite_original";

    // Insert individual chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);
      
      const { error } = await supabaseService.from("knowledge_base_chunks").insert({
        content: chunk,
        source: source,
        document_type: docType,
        original_ref: "Source: " + source,
        // FIXED: Added missing 'chunk_type', 'chunk_index', 'char_count' to satisfy schema
        chunk_type: "text", 
        chunk_index: i,
        char_count: chunk.length,
        metadata: { url: url || null }, 
        embedding: embedding
      });

      if (error) {
        console.error("Supabase Insert Error:", error);
        throw error; 
      }
      chunksProcessed++;
    }

    // 4. SAVE SUMMARY TO 'chunks_by_document'
    // This ensures your admin dashboard sees the document immediately
    const { error: summaryError } = await supabaseService.from("chunks_by_document").upsert({
        source: source,
        document_type: docType,
        chunk_count: chunksProcessed,
        total_chars: processedContent.length,
        chunk_type_used: ["text"],
        first_ingested: new Date().toISOString()
    }, { onConflict: "source" });

    if (summaryError) {
        console.warn("Summary table insert failed (non-critical):", summaryError);
    }

    return NextResponse.json({
      success: true,
      chunksProcessed,
      message: `${chunksProcessed} chunks stored in Knowledge Base.`
    });

  } catch (err: any) {
    console.error("Ingest Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}