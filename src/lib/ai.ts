import ZAI from "z-ai-web-dev-sdk";

/**
 * Server-side LLM helper. Uses z-ai-web-dev-sdk (backend only!).
 * Falls back to `fallback` content when the SDK errors so the UI never breaks.
 */
export async function aiChat(
  messages: { role: "user" | "assistant"; content: string }[],
  fallback?: string
): Promise<string> {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    const content = completion.choices[0]?.message?.content;
    if (content && content.trim().length > 0) return content.trim();
    throw new Error("Empty AI response");
  } catch (e) {
    console.error("[aiChat] SDK error:", (e as Error).message);
    if (fallback !== undefined) return fallback;
    throw e;
  }
}
