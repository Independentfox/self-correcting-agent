import { NextResponse } from "next/server";
import { simulateConversation, loadScript } from "@/lib/orchestrator";
import { logger } from "@/lib/logger";
import type { Persona } from "@/lib/types";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { persona, iteration = 0 } = (await req.json()) as {
      persona: Persona;
      iteration?: number;
    };
    logger.info("api/run-test", `POST — persona=${persona.name}, iteration=${iteration}`);
    const script = loadScript(iteration);
    const conversation = await simulateConversation(script, persona);
    logger.info("api/run-test", `Conversation completed in ${Date.now() - start}ms — ${conversation.totalTurns} turns, outcome=${conversation.outcome}`);
    return NextResponse.json({ conversation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run test";
    logger.error("api/run-test", `Failed after ${Date.now() - start}ms`, { message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
