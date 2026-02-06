// src/lib/memory.ts
import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabaseService } from "@/lib/supabaseService";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const API_KEY = process.env.TOGETHER_API_KEY!;
const together = createTogetherAI({ apiKey: API_KEY });

// UPGRADE: Using Llama 3.1 8B
// Why: Standardizing on Llama 3.1 ensures consistent performance and reliability.
// It is fast, cheap, and excellent at following JSON/Tag extraction instructions.
const MEMORY_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

export async function updateMemory(userId: string | null, lastUserMessage: string, currentMemory: string | null) {
  if (!userId || !lastUserMessage) {
    console.log("[Umbil Memory] Skipped: No userId or message.");
    return;
  }

  try {
    console.log(`[Umbil Memory] Generating update for user ${userId}...`);
    
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
    // Relaxed Regex: Handles optional bolding **[[[MEMORY]]]** and case insensitivity
    const memoryMatch = rawOutput.match(/\[\[\[MEMORY\]\]\]([\s\S]*?)(\[\[\[\/MEMORY\]\]\]|$)/i);
    
    // If tags are found, use content inside. If not, fallback to full text (legacy safety).
    let cleanedMemory = memoryMatch ? memoryMatch[1].trim() : rawOutput.trim();

    // Clean up any lingering markdown artifacts if the regex missed them
    cleanedMemory = cleanedMemory.replace(/^\[\[\[MEMORY\]\]\]/i, '').replace(/\[\[\[\/MEMORY\]\]\]$/i, '').trim();

    // 3. CHECK: Did the model find nothing new?
    if (cleanedMemory === "__NO_UPDATE__" || cleanedMemory === (currentMemory || "").trim()) {
        console.log("[Umbil Memory] No new facts found.");
        return;
    }

    // Safety: If the model still hallucinates "No facts found" inside the tags, ignore it.
    if (cleanedMemory.toLowerCase().includes("no permanent facts") || cleanedMemory.length < 5) {
        console.log("[Umbil Memory] Output rejected (too short or empty phrase).");
        return;
    }

    // 4. Update the database (silently)
    const { error } = await supabaseService
      .from("profiles")
      .update({ custom_instructions: cleanedMemory })
      .eq("id", userId);

    if (error) {
        console.error("[Umbil Memory] DB Update Error:", error);
    } else {
        console.log(`[Umbil Memory] Successfully updated for user ${userId}`);
    }

  } catch (error) {
    console.error("[Umbil Memory] Failed to update memory:", error);
    // Non-blocking error - we don't want to crash the chat if memory fails
  }
}