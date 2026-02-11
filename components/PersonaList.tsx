"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Persona, Evaluation } from "@/lib/types";

interface PersonaListProps {
  personas: Persona[];
  evaluations: Evaluation[];
  selectedPersonaId: string | null;
  onSelectPersona: (id: string) => void;
}

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-600";
  if (score >= 5) return "text-amber-600";
  return "text-red-600";
}

function difficultyVariant(
  difficulty: Persona["difficulty"]
): "default" | "secondary" | "destructive" {
  switch (difficulty) {
    case "easy":
      return "secondary";
    case "medium":
      return "default";
    case "hard":
      return "destructive";
  }
}

export function PersonaList({
  personas,
  evaluations,
  selectedPersonaId,
  onSelectPersona,
}: PersonaListProps) {
  const evalMap = new Map(evaluations.map((e) => [e.personaId, e]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-balance">
          Personas ({personas.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {personas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No personas generated yet.
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {personas.map((persona) => {
                const evaluation = evalMap.get(persona.id);
                const isSelected = selectedPersonaId === persona.id;

                return (
                  <button
                    key={persona.id}
                    onClick={() => onSelectPersona(persona.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">
                        {persona.name}
                      </span>
                      <Badge
                        variant={difficultyVariant(persona.difficulty)}
                        className="text-[10px] ml-2 shrink-0"
                      >
                        {persona.difficulty}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {persona.financialSituation}
                    </p>
                    {evaluation && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                        <span
                          className={`text-xs font-medium tabular-nums ${scoreColor(
                            evaluation.overallScore
                          )}`}
                        >
                          {evaluation.overallScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          N:{evaluation.metrics.negotiationEffectiveness.score} R:
                          {evaluation.metrics.responseRelevance.score}
                        </span>
                        {evaluation.passed ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] ml-auto"
                          >
                            Pass
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[10px] ml-auto"
                          >
                            Fail
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
