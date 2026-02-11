import { NextResponse } from "next/server";
import { rewriteScript, loadScript, loadFailureAnalysis } from "@/lib/orchestrator";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { iteration = 0 } = await req.json();
    logger.info("api/rewrite-script", `POST — iteration=${iteration}`);
    const script = loadScript(iteration);
    const failureAnalysis = loadFailureAnalysis(iteration);

    if (!failureAnalysis) {
      logger.warn("api/rewrite-script", `No failure analysis found for iteration ${iteration}`);
      return NextResponse.json(
        { error: "No failure analysis found for this iteration" },
        { status: 400 }
      );
    }

    const newScript = await rewriteScript(script, failureAnalysis, iteration);
    logger.info("api/rewrite-script", `Script rewritten in ${Date.now() - start}ms — v${script.version} → v${newScript.version}`);
    return NextResponse.json({ script: newScript });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rewrite script";
    logger.error("api/rewrite-script", `Failed after ${Date.now() - start}ms`, { message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
