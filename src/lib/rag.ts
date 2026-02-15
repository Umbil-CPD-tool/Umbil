// src/lib/rag.ts

import { OpenAI } from "openai";
import { supabaseService } from "./supabaseService";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateEmbedding(text: string){
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " "),
  });
  return response.data[0].embedding;
}

// Context searching in supabase
export async function getLocalContext(query: string): Promise<string> {
  try {
    const embedding = await generateEmbedding(query);

    const { data: documents, error } = await supabaseService.rpc("match_docs", {
      query_embedding: embedding,
      match_threshold: 0.5, // fairly relevant matches
      match_count: 5,       // top 5 matches
    });

    if (error) {
      console.error("Supabase vector search error: ", error);
      return "";
    }

    if (!documents || documents.length === 0) {
      return "";
    }

    // results formatting
    const contextText = documents.map((doc: any) => {
      const source = doc.metadata?.source || "Unknown Source";
      return `--- Source: ${source} ---\n${doc.content}`;
    }).join("\n\n");

    return`-- LOCAL / PERSONAL GUIDELINES (SOURCE A) --\n${contextText}\n------\n`;
  } catch (err) {
    console.error("RAG Context Error:", err);
    return "";
  }
}

// Source B: Academic Search (Europe PMC)
export async function getAcademicContext(query: string): Promise<string> {
  try {
    // Search for recent open access articles
    const encodedQuery = encodeURIComponent(`${query} OPEN_ACCESS:y SORT_DATE:y`);
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodedQuery}&format=json&pageSize=3&resultType=core`;

    const res = await fetch(url);
    if (!res.ok) return "";

    const data = await res.json();
    if (!data.resultList || !data.resultList.result) return "";

    const articles = data.resultList.result.map((article: any) => {
      const title = article.title;
      const abstract = article.abstractText || "No abstract available.";
      const source = article.source + " " + article.id; // e.g. MED 123456
      return `Title: ${title}\nSourceID: ${source}\nAbstract: ${abstract}`;
    }).join("\n\n");

    if (!articles) return "";

    return `-- ACADEMIC RESEARCH (SOURCE B - EUROPE PMC) --\n${articles}\n------\n`;
  } catch (err) {
    console.error("Europe PMC Search Error:", err);
    return "";
  }
}