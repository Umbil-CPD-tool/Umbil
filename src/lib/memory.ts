// src/lib/memory.ts
import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabaseService } from "@/lib/supabaseService";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const API_KEY = process.env.TOGETHER_API_KEY!;
const together = createTogetherAI({ apiKey: API_KEY });

// UPGRADE: Using Gemma 2 9B
// Why: The best "Low Cost" model that is still smart enough.
// - Cost: ~$0.20 per 1M tokens.
// - Intelligence: Beats Llama 3.1 8B in logic/instruction following.
// - Perfect for the "Clinician vs Patient" safety firewall.
const MEMORY_MODEL = "google/gemma-2-9b-it";

export async function updateMemory(userId: string | null, lastUserMessage: string, currentMemory: string | null) {
  if (!userId || !lastUserMessage) return;

  try {
    // 1. Generate the updated memory string using AI
    const { text: rawOutput } = await generateText({
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

    // 2. PARSE THE OUTPUT
    // We expect the model to wrap the actual memory in [[[MEMORY]]] ... [[[/MEMORY]]] tags
    const memoryMatch = rawOutput.match(/\[\[\[MEMORY\]\]\]([\s\S]*?)\[\[\[\/MEMORY\]\]\]/);
    
    // If tags are found, use content inside. If not, fallback to full text (legacy safety).
    const cleanedMemory = memoryMatch ? memoryMatch[1].trim() : rawOutput.trim();

    // 3. CHECK: Did the model find nothing new?
    if (cleanedMemory === "__NO_UPDATE__" || cleanedMemory === (currentMemory || "").trim()) {
        return;
    }

    // Safety: If the model still hallucinates "No facts found" inside the tags, ignore it.
    if (cleanedMemory.toLowerCase().includes("no permanent facts") || cleanedMemory.length < 5) {
        return;
    }

    // 4. Update the database (silently)
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