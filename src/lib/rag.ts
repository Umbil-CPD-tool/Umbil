// src/lib/rag.ts
import { OpenAI } from "openai";
import { supabaseService } from "./supabaseService";

// Client for Embeddings (Together AI)
const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

// Generates embeddings using BAAI/bge-base-en-v1.5 (768 dimensions)
export async function generateEmbedding(text: string) {
  try {
    const response = await together.embeddings.create({
      model: "BAAI/bge-base-en-v1.5",
      input: text.replace(/\n/g, " "),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding with Together AI:", error);
    throw error;
  }
}

// Source A: Local Context (Supabase Hybrid Search + Reranking)
export async function getLocalContext(query: string): Promise<string> {
  try {
    // 1. Generate Query Embedding
    const embedding = await generateEmbedding(query);

    // 2. Fetch Candidates using HYBRID Search (Vector + Keyword)
    // We fetch top 30 candidates to give the reranker a wide selection of "keyword" and "vector" matches.
    const { data: documents, error } = await supabaseService.rpc("match_docs", {
      query_embedding: embedding,
      match_threshold: 0.3, // Lower threshold to cast a wider net
      match_count: 30,      
      query_text: query,    // <--- THIS enables the keyword search in your new SQL function
    });

    if (error) {
      console.error("Supabase vector search error: ", error);
      return "";
    }

    if (!documents || documents.length === 0) {
      return "";
    }

    let finalDocs = documents;

    // 3. RERANKING STEP (Refining the Hybrid results)
    try {
        const rerankRes = await fetch("https://api.together.xyz/v1/rerank", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "BAAI/bge-reranker-v2-m3",
                query: query,
                documents: documents.map((d: any) => d.content),
                top_n: 5 // We only want the absolute best 5 for the AI to read
            })
        });

        if (rerankRes.ok) {
            const data = await rerankRes.json();
            // Map the reranked indices back to our original document objects
            if (data.results) {
                finalDocs = data.results.map((r: any) => documents[r.index]);
            }
        } else {
            console.warn("Rerank API failed, falling back to hybrid order.");
            finalDocs = documents.slice(0, 5);
        }
    } catch (rerankErr) {
        console.error("Rerank error:", rerankErr);
        // Fallback: just take the top 5 matches
        finalDocs = documents.slice(0, 5);
    }

    // results formatting
    const contextText = finalDocs.map((doc: any) => {
      const source = doc.metadata?.source || "Unknown Source";
      return `--- Source: ${source} ---\n${doc.content}`;
    }).join("\n\n");

    return`-- LOCAL / PERSONAL GUIDELINES (SOURCE A) --\n${contextText}\n------\n`;
  } catch (err) {
    console.error("RAG Context Error:", err);
    return "";
  }
}

// Source B: Academic Search (Europe PMC) - WITH UK BIAS & SAFETY FILTER
export async function getAcademicContext(query: string): Promise<string> {
  try {
    // SECURITY UPDATE: We append (UK OR NHS OR NICE) to bias results towards UK standards.
    const biasedQuery = `${query} AND (UK OR NHS OR NICE)`;

    const encodedQuery = encodeURIComponent(`${biasedQuery} OPEN_ACCESS:y SORT_DATE:y`);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodedQuery}&format=json&pageSize=3&resultType=core`;

    const res = await fetch(url);
    if (!res.ok) return "";

    const data = await res.json();
    if (!data.resultList || !data.resultList.result) return "";

    const articles = data.resultList.result.map((article: any) => {
      const title = article.title;
      const abstract = article.abstractText || "No abstract available.";
      const source = article.source + " " + article.id; 
      // Add journal title to help model identify non-UK sources (e.g. "American Journal of...")
      const journal = article.journalInfo?.journal?.title || "Unknown Journal"; 
      
      return `Title: ${title}\nJournal: ${journal}\nSourceID: ${source}\nAbstract: ${abstract}`;
    }).join("\n\n");

    if (!articles) return "";

    return `-- ACADEMIC RESEARCH (SOURCE B - EUROPE PMC) --\n${articles}\n------\n`;
  } catch (err) {
    console.error("Europe PMC Search Error:", err);
    return "";
  }
}