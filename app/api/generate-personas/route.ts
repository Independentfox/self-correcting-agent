import { NextResponse } from "next/server";
import { generatePersonas } from "@/lib/orchestrator";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { numPersonas = 6 } = await req.json();
    logger.info("api/generate-personas", `POST — numPersonas=${numPersonas}`);
    const personas = await generatePersonas(numPersonas);
    logger.info("api/generate-personas", `Generated ${personas.length} personas in ${Date.now() - start}ms`);
    return NextResponse.json({ personas });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate personas";
    logger.error("api/generate-personas", `Failed after ${Date.now() - start}ms`, { message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
