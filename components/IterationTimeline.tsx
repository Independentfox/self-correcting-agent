"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { IterationSummary } from "@/lib/types";

interface IterationTimelineProps {
  summaries: IterationSummary[];
  selectedIteration: number;
  onSelectIteration: (iteration: number) => void;
}

export function IterationTimeline({
  summaries,
  selectedIteration,
  onSelectIteration,
}: IterationTimelineProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-balance">
          Iteration Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No iterations completed yet.
          </p>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {summaries.map((summary) => {
                const isSelected = selectedIteration === summary.iteration;
                const passed = summary.avgOverallScore >= 7;

                return (
                  <button
                    key={summary.iteration}
                    onClick={() => onSelectIteration(summary.iteration)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">
                        Iteration {summary.iteration}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] tabular-nums"
                        >
                          v{summary.scriptVersion}
                        </Badge>
                        {passed ? (
                          <Badge className="text-[10px]">Pass</Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[10px]"
                          >
                            Fail
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Overall</span>
                        <p className="font-medium tabular-nums">
                          {summary.avgOverallScore.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pass Rate</span>
                        <p className="font-medium tabular-nums">
                          {summary.passRate.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Personas</span>
                        <p className="font-medium tabular-nums">
                          {summary.totalPersonas}
                        </p>
                      </div>
                    </div>

                    {summary.failurePatterns.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-[10px] text-muted-foreground line-clamp-2 text-pretty">
                          {summary.failurePatterns.slice(0, 2).join("; ")}
                        </p>
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
