import { NextResponse } from "next/server";
import { runIteration } from "@/lib/orchestrator";
import { logger } from "@/lib/logger";

export const maxDuration = 300;

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const { iteration = 0, numPersonas = 6, threshold = 7.5 } = body;
    logger.info("api/run-iteration", `POST — iteration=${iteration}, personas=${numPersonas}, threshold=${threshold}`);
    const result = await runIteration(iteration, numPersonas, threshold);
    logger.info("api/run-iteration", `Completed in ${Date.now() - start}ms — done=${result.done}, score=${result.summary.avgOverallScore}`);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run iteration";
    logger.error("api/run-iteration", `Failed after ${Date.now() - start}ms`, { message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
