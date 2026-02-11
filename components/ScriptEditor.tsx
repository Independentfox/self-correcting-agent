"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BotScript } from "@/lib/types";

interface ScriptEditorProps {
  script: BotScript | null;
  isRunning: boolean;
}

export function ScriptEditor({ script, isRunning }: ScriptEditorProps) {
  if (!script) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-balance">
            Bot Script
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No script loaded. Run an iteration to begin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-balance">
          Bot Script
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            v{script.version}
          </Badge>
          {isRunning && (
            <Badge variant="outline" className="text-muted-foreground">
              Read-only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-[280px]">
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-pretty">
            {script.content}
          </pre>
        </ScrollArea>
        {script.changesSummary && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Changes from v{script.parentVersion}
            </p>
            <p className="text-xs text-muted-foreground text-pretty">
              {script.changesSummary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
