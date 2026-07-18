// src/lib/memory.ts
import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabaseService } from "@/lib/supabaseService";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const API_KEY = process.env.TOGETHER_API_KEY!;
const together = createTogetherAI({ apiKey: API_KEY });

// Fast Together serverless instruct model (Llama 3.1 8B Turbo is no longer serverless)
const MEMORY_MODEL = "Qwen/Qwen2.5-7B-Instruct-Turbo";

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

    // 2. PARSE THE JSON OUTPUT
    let parsedOutput;
    try {
      // Strip markdown JSON codeblocks if the model decides to wrap it
      const cleanJson = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedOutput = JSON.parse(cleanJson);
    } catch (e) {
      console.error("[Umbil Memory] Failed to parse JSON:", rawOutput, e);
      return;
    }

    // 3. CHECK: Did the model find nothing new?
    if (!parsedOutput.update_required || parsedOutput.memory === "__NO_UPDATE__" || parsedOutput.memory === (currentMemory || "").trim()) {
        console.log("[Umbil Memory] No new facts found.");
        return;
    }

    // Safety: If the model still hallucinates "No facts found" inside the memory block, ignore it.
    if (parsedOutput.memory.toLowerCase().includes("no permanent facts") || parsedOutput.memory.length < 5) {
        console.log("[Umbil Memory] Output rejected (too short or empty phrase).");
        return;
    }

    // 4. Update the database (silently)
    const { error } = await supabaseService
      .from("profiles")
      .update({ custom_instructions: parsedOutput.memory })
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