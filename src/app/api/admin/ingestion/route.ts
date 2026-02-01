// src/app/api/admin/ingestion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { generateEmbedding } from "@/lib/rag";
import { OpenAI } from "openai";
import { INGESTION_PROMPT } from "@/lib/prompts";
import { chunkMarkdownContent } from "@/lib/markdown_chunker";
import { Truculenta } from "next/font/google";

const openai = new OpenAI();
const MODEL_SLUG = "gpt-4"; // Note: 'gpt-4.1' isn't a standard public model slug yet, reverted to 'gpt-4' to be safe, or change back if you have specific access.

export async function POST(request: NextRequest) {
  try {
    const { text, source, documentType} = await request.json();

    if (!text || !source) {
      return NextResponse.json({ error: "Missing text or source" }, {status: 400});
    }

    // 1. rewrite step
    const completion = await openai.chat.completions.create({
      model: MODEL_SLUG,
      messages: [
      {
        role: "system",
        content: `${INGESTION_PROMPT}
        Include the source citation at the end of the rewritten original content.
        Source: ${source}`
      },
      {
        role: "user",
        content: text
      }
      ],
      temperature: 0.3, // This keeps it highly factual and avoid hallucination
    });

    const originalUmbilContent = completion.choices[0].message.content;

    if (!originalUmbilContent) {
      throw new Error("OpenAI returned no content");
    }

    const rewrittenContent = originalUmbilContent;

    // 2. Markdown-aware chonking
    const chunks = chunkMarkdownContent(originalUmbilContent, {
      maxChunkSize: 1000,  // Adjust based on your embedding model
      minChunkSize: 100,   // Minimum chunk size to keep
      overlapSize: 100,    // Overlap between chunks for context
    });


    // 3. embed & store in supabase
    let chunksProcessed = 0;

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await generateEmbedding(chunk.content);
      
      await supabaseService.from("knowledge_base_chunks").insert({
        content: chunk.content,
        embedding: embedding,
        source: source,
        document_type: documentType,
        original_ref: `Based on: ${source}`,
        headers: chunk.metadata.headers,
        header_level: chunk.metadata.headers.length,
        chunk_type: chunk.metadata.type,
        chunk_index: index,
        char_count: chunk.content.length,
        
        // Additional flexible metadata (optional)
        metadata: {          
          // Add markdown-specific metadata
          has_code: chunk.metadata.type === 'code',
          has_list: chunk.metadata.type === 'list',
          
          // You can add custom medical metadata here
          // medical_topic: extractMedicalTopic(chunk.metadata.headers),
          // urgency_level: detectUrgency(chunk.content),
          // target_audience: 'parents',
        }
      });
      chunksProcessed++;
    }

    return NextResponse.json({
      success: true,
      chunksProcessed,
      rewrittenContent,
      message: "Contents have been rewritten and stored as Umbil Original into the RAG system."
    });

  } catch(err: any) {
    console.error("Ingestion Error: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}