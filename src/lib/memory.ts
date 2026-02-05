// src/lib/memory.ts
import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabaseService } from "@/lib/supabaseService";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const API_KEY = process.env.TOGETHER_API_KEY!;
const together = createTogetherAI({ apiKey: API_KEY });

// Using a fast, efficient model for the background task
const MEMORY_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

export async function updateMemory(userId: string | null, lastUserMessage: string, currentMemory: string | null) {
  if (!userId || !lastUserMessage) return;

  try {
    // 1. Generate the updated memory string using AI
    const { text: updatedMemory } = await generateText({
      model: together(MEMORY_MODEL),
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.MEMORY_CONSOLIDATOR },
        { 
          role: "user", 
          content: `CURRENT MEMORY:\n${currentMemory || "None"}\n\nNEW USER MESSAGE:\n"${lastUserMessage}"` 
        }
      ],
      temperature: 0.1, // Low temp for consistent, factual updates
    });

    const cleanedMemory = updatedMemory.trim();

    // 2. CHECK: Did the model find nothing new?
    // We check for our specific "No Update" flag OR if the text is identical to before.
    if (cleanedMemory === "__NO_UPDATE__" || cleanedMemory === (currentMemory || "").trim()) {
        // console.log(`[Umbil Memory] No changes detected for user ${userId}`);
        return;
    }

    // Safety: If the model hallucinates "No facts found" (despite instructions), we ignore it to prevent DB junk.
    if (cleanedMemory.toLowerCase().includes("no permanent facts") || cleanedMemory.length < 5) {
        return;
    }

    // 3. Update the database (silently)
    await supabaseService
      .from("profiles")
      .update({ custom_instructions: cleanedMemory })
      .eq("id", userId);

    console.log(`[Umbil Memory] Updated for user ${userId}`);

  } catch (error) {
    console.error("[Umbil Memory] Failed to update memory:", error);
    // Non-blocking error - we don't want to crash the chat if memory fails
  }
}