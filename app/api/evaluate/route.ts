import { NextResponse } from "next/server";
import { evaluateConversation } from "@/lib/orchestrator";
import { logger } from "@/lib/logger";
import type { Conversation, Persona } from "@/lib/types";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { conversation, persona } = (await req.json()) as {
      conversation: Conversation;
      persona: Persona;
    };
    logger.info("api/evaluate", `POST — persona=${persona.name}, turns=${conversation.totalTurns}`);
    const evaluation = await evaluateConversation(conversation, persona);
    logger.info("api/evaluate", `Evaluation done in ${Date.now() - start}ms — score=${evaluation.overallScore}, passed=${evaluation.passed}`);
    return NextResponse.json({ evaluation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate";
    logger.error("api/evaluate", `Failed after ${Date.now() - start}ms`, { message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
