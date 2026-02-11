import { NextResponse } from "next/server";
import {
  loadAllSummaries,
  loadScript,
  loadPersonas,
  loadConversation,
  loadEvaluations,
  loadFailureAnalysis,
} from "@/lib/orchestrator";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const iteration = parseInt(searchParams.get("iteration") || "0");
    const personaId = searchParams.get("personaId");

    switch (type) {
      case "summaries":
        return NextResponse.json({ summaries: loadAllSummaries() });
      case "script":
        return NextResponse.json({ script: loadScript(iteration) });
      case "personas":
        return NextResponse.json({ personas: loadPersonas(iteration) });
      case "conversation":
        if (!personaId) {
          return NextResponse.json(
            { error: "personaId required" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          conversation: loadConversation(iteration, personaId),
        });
      case "evaluations":
        return NextResponse.json({
          evaluations: loadEvaluations(iteration),
        });
      case "failures":
        return NextResponse.json({
          analysis: loadFailureAnalysis(iteration),
        });
      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
