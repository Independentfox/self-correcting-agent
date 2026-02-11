import Groq from "groq-sdk";
import { DEFAULT_CONFIG } from "./config";
import { logger } from "./logger";

const TAG = "groq";

let _groq: Groq | null = null;

function getGroq(): Groq {
  if (!_groq) {
    const hasKey = !!process.env.GROQ_API_KEY;
    logger.info(TAG, `Initializing Groq client (API key present: ${hasKey})`);
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return _groq;
}

export async function callGroq(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const groq = getGroq();
  const systemMsg = messages.find((m) => m.role === "system")?.content?.slice(0, 80);
  const msgCount = messages.length;
  logger.debug(TAG, `Calling Groq: ${msgCount} messages, temp=${options?.temperature ?? 0.7}, system="${systemMsg}..."`);

  const start = Date.now();
  try {
    const response = await groq.chat.completions.create({
      model: DEFAULT_CONFIG.groqModel,
      messages: messages as Parameters<
        typeof groq.chat.completions.create
      >[0]["messages"],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });
    const content = response.choices[0]?.message?.content || "";
    const elapsed = Date.now() - start;
    const usage = response.usage;
    logger.info(TAG, `Groq response: ${elapsed}ms, ${content.length} chars, tokens=${usage?.total_tokens ?? "?"} (prompt=${usage?.prompt_tokens ?? "?"}, completion=${usage?.completion_tokens ?? "?"})`);
    return content;
  } catch (err) {
    const elapsed = Date.now() - start;
    logger.error(TAG, `Groq call failed after ${elapsed}ms`, err instanceof Error ? err.message : err);

    // Retry once on rate limit
    if (err instanceof Error && (err.message.includes("rate_limit") || err.message.includes("429"))) {
      logger.warn(TAG, "Rate limited — retrying in 5s...");
      await delay(5000);
      const response = await groq.chat.completions.create({
        model: DEFAULT_CONFIG.groqModel,
        messages: messages as Parameters<
          typeof groq.chat.completions.create
        >[0]["messages"],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      });
      const content = response.choices[0]?.message?.content || "";
      logger.info(TAG, `Retry succeeded: ${content.length} chars`);
      return content;
    }
    throw err;
  }
}

export async function callGroqJSON(
  messages: { role: string; content: string }[]
): Promise<unknown> {
  const response = await callGroq(messages, { temperature: 0.3 });
  const cleaned = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    logger.error(TAG, "JSON parse failed. Raw response (first 500 chars):", cleaned.slice(0, 500));
    throw new Error(`Failed to parse Groq JSON response: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
  }
}

export async function delay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
