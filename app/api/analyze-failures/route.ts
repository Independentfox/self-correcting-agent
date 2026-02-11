import { NextResponse } from "next/server";
import { analyzeFailures } from "@/lib/orchestrator";
import { logger } from "@/lib/logger";
import type { Evaluation } from "@/lib/types";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { evaluations } = (await req.json()) as {
      evaluations: Evaluation[];
    };
    logger.info("api/analyze-failures", `POST — ${evaluations.length} evaluations`);
    const analysis = await analyzeFailures(evaluations);
    logger.info("api/analyze-failures", `Analysis done in ${Date.now() - start}ms — ${analysis.patterns.length} patterns found`);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze failures";
    logger.error("api/analyze-failures", `Failed after ${Date.now() - start}ms`, { message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
