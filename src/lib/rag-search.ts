// src/lib/rag-search.ts

import { supabaseService } from './supabaseService';

interface SearchResult {
  id: string;
  content: string;
  source: string;
  headers: string[];
  chunk_type: string;
  similarity: number;
}

/**
 * Generate embedding for a query using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Search knowledge base using vector similarity
 */
export async function searchKnowledgeBase(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<SearchResult[]> {
  const {
    matchThreshold = 0.7,  // Minimum similarity score (0-1)
    matchCount = 3,        // Number of chunks to retrieve
  } = options;

  try {
    // 1. Generate embedding for the user's query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search using the match function from your SQL
    const { data, error } = await supabaseService.rpc('match_knowledge_base_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Knowledge base search failed:', error);
    return [];
  }
}

/**
 * Format retrieved chunks into context for the LLM
 */
export function formatContextForLLM(chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return '';
  }

  const formattedChunks = chunks.map((chunk, index) => {
    const headerPath = chunk.headers.join(' > ');
    const sourceInfo = headerPath ? `[${headerPath}]` : `[${chunk.source}]`;
    
    return `Context ${index + 1} ${sourceInfo}:
${chunk.content}`;
  });

  return formattedChunks.join('\n\n---\n\n');
}

/**
 * Format sources for citation in response
 */
export function formatSources(chunks: SearchResult[]): Array<{
  path: string;
  source: string;
  similarity: number;
}> {
  return chunks.map(chunk => ({
    path: chunk.headers.length > 0 
      ? chunk.headers.join(' > ') 
      : chunk.source,
    source: chunk.source,
    similarity: Math.round(chunk.similarity * 100) / 100, // Round to 2 decimals
  }));
}