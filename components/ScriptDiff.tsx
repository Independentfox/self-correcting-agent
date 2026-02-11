"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BotScript } from "@/lib/types";

interface ScriptDiffProps {
  oldScript: BotScript | null;
  newScript: BotScript | null;
}

export function ScriptDiff({ oldScript, newScript }: ScriptDiffProps) {
  if (!oldScript || !newScript) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-balance">
            Script Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Run at least two iterations to see script changes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const oldLines = oldScript.content.split("\n");
  const newLines = newScript.content.split("\n");

  // Simple diff: find added/removed lines
  const oldSet = new Set(oldLines.map((l) => l.trim()));
  const newSet = new Set(newLines.map((l) => l.trim()));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-balance">
          Script Changes
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            v{oldScript.version}
          </Badge>
          <span className="text-xs text-muted-foreground">&rarr;</span>
          <Badge className="text-[10px] tabular-nums">
            v{newScript.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {newScript.changesSummary && (
          <div className="mb-3 p-2 rounded-md bg-muted">
            <p className="text-xs font-medium mb-1">Changes Summary</p>
            <p className="text-xs text-muted-foreground text-pretty">
              {newScript.changesSummary}
            </p>
          </div>
        )}
        <ScrollArea className="h-[240px]">
          <div className="space-y-0.5 font-mono text-[11px]">
            {newLines.map((line, i) => {
              const trimmed = line.trim();
              const isAdded = trimmed && !oldSet.has(trimmed);

              return (
                <div
                  key={i}
                  className={`px-2 py-0.5 rounded-sm ${
                    isAdded
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : ""
                  }`}
                >
                  <span className="text-muted-foreground mr-2 tabular-nums select-none">
                    {isAdded ? "+" : " "}
                  </span>
                  {line || "\u00A0"}
                </div>
              );
            })}
            {oldLines.map((line, i) => {
              const trimmed = line.trim();
              const isRemoved = trimmed && !newSet.has(trimmed);
              if (!isRemoved) return null;

              return (
                <div
                  key={`removed-${i}`}
                  className="px-2 py-0.5 rounded-sm bg-red-500/10 text-red-700 dark:text-red-400"
                >
                  <span className="text-muted-foreground mr-2 tabular-nums select-none">
                    -
                  </span>
                  {line || "\u00A0"}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
