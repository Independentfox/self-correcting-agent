"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation, Evaluation, Persona } from "@/lib/types";

interface ConversationViewerProps {
  conversation: Conversation | null;
  evaluation: Evaluation | null;
  persona: Persona | null;
}

export function ConversationViewer({
  conversation,
  evaluation,
  persona,
}: ConversationViewerProps) {
  if (!conversation || !persona) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-balance">
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a persona to view the conversation transcript.
          </p>
        </CardContent>
      </Card>
    );
  }

  const failedTurns = new Set(
    evaluation?.failures.map((f) => f.turnNumber) ?? []
  );

  const outcomeLabel: Record<Conversation["outcome"], string> = {
    agreement_reached: "Agreement Reached",
    call_ended: "Call Ended",
    escalation: "Escalation",
    hung_up: "Hung Up",
    unresolved: "Unresolved",
  };

  const outcomeVariant: Record<
    Conversation["outcome"],
    "default" | "secondary" | "destructive"
  > = {
    agreement_reached: "default",
    call_ended: "secondary",
    escalation: "destructive",
    hung_up: "destructive",
    unresolved: "secondary",
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-balance">
          {persona.name}&apos;s Conversation
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className="tabular-nums text-[10px]">
            {conversation.totalTurns} turns
          </Badge>
          <Badge
            variant={outcomeVariant[conversation.outcome]}
            className="text-[10px]"
          >
            {outcomeLabel[conversation.outcome]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-3">
            {conversation.turns.map((turn) => {
              const isBot = turn.role === "bot";
              const isFailed = failedTurns.has(turn.turnNumber);
              const failure = evaluation?.failures.find(
                (f) => f.turnNumber === turn.turnNumber
              );

              return (
                <div
                  key={turn.turnNumber}
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isBot
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    } ${isFailed ? "ring-2 ring-red-500/50" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] opacity-70 tabular-nums">
                        #{turn.turnNumber}
                      </span>
                      <span className="text-[10px] font-medium opacity-70">
                        {isBot ? "Bot" : "Borrower"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-pretty">
                      {turn.content}
                    </p>
                    {failure && (
                      <div className="mt-2 pt-2 border-t border-red-500/20">
                        <p className="text-[10px] text-red-300">
                          {failure.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
