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

// Source A: Local Context (Supabase Hybrid Search + Reranking + Structured Data)
export async function getLocalContext(query: string): Promise<string> {
  try {
    // 1. Generate Query Embedding
    const embedding = await generateEmbedding(query);

    // 2. Fetch Candidates using HYBRID Search (Vector + Keyword)
    const { data: documents, error } = await supabaseService.rpc("match_docs", {
      query_embedding: embedding,
      match_threshold: 0.3, 
      match_count: 30,      
      query_text: query,    
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
                top_n: 5 
            })
        });

        if (rerankRes.ok) {
            const data = await rerankRes.json();
            if (data.results) {
                finalDocs = data.results.map((r: any) => documents[r.index]);
            }
        } else {
            console.warn("Rerank API failed, falling back to hybrid order.");
            finalDocs = documents.slice(0, 5);
        }
    } catch (rerankErr) {
        console.error("Rerank error:", rerankErr);
        finalDocs = documents.slice(0, 5);
    }

    // 4. STRUCTURED DATA INJECTION (Safety fix for precise dosing)
    // Extract potential drug names from the user query to check our structured tables
    const queryWords = query.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const capitalizedWords = queryWords.map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const searchTerms = [...new Set([...queryWords, ...capitalizedWords])];

    let structuredDoseText = "";
    if (searchTerms.length > 0) {
      const { data: doses } = await supabaseService
        .from('drug_doses')
        .select('*')
        .in('drug_name', searchTerms);

      if (doses && doses.length > 0) {
        structuredDoseText = "\n-- STRUCTURED DOSING RULES (HIGHEST PRIORITY) --\n" + doses.map((d: any) => 
          `Drug: ${d.drug_name} | Patient Group: ${d.patient_group} | Route: ${d.route} | Dose: ${d.dose_value} | Freq: ${d.frequency} | Condition: ${d.condition || 'General'}`
        ).join("\n") + "\n------------------------------------------------\n\n";
      }
    }

    // 5. Results formatting
    const contextText = finalDocs.map((doc: any) => {
      const source = doc.metadata?.source || "Unknown Source";
      return `--- Source: ${source} ---\n${doc.content}`;
    }).join("\n\n");

    return `-- LOCAL / PERSONAL GUIDELINES (SOURCE A) --\n${structuredDoseText}${contextText}\n------\n`;
  } catch (err) {
    console.error("RAG Context Error:", err);
    return "";
  }
}

// Source B: Academic Search (Europe PMC) - WITH UK BIAS & SAFETY FILTER
export async function getAcademicContext(query: string): Promise<string> {
  try {
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