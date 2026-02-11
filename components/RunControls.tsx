"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { RunConfig } from "@/lib/types";

interface RunControlsProps {
  config: RunConfig;
  onConfigChange: (config: RunConfig) => void;
  onRunSingle: () => void;
  onRunLoop: () => void;
  onStop: () => void;
  onReset: () => void;
  isRunning: boolean;
  progress: string;
  currentIteration: number;
}

export function RunControls({
  config,
  onConfigChange,
  onRunSingle,
  onRunLoop,
  onStop,
  onReset,
  isRunning,
  progress,
  currentIteration,
}: RunControlsProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const updateConfig = (partial: Partial<RunConfig>) => {
    const updated = { ...localConfig, ...partial };
    setLocalConfig(updated);
    onConfigChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-balance">
            Controls
          </CardTitle>
          {isRunning && (
            <Badge variant="secondary" className="tabular-nums text-[10px]">
              Iteration {currentIteration}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onRunSingle}
            disabled={isRunning}
          >
            Run Single Iteration
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onRunLoop}
            disabled={isRunning}
          >
            Run Self-Correction Loop
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            disabled={!isRunning}
          >
            Stop
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            disabled={isRunning}
          >
            Reset
          </Button>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground text-pretty">
              {progress}
            </p>
            <Progress value={undefined} className="h-1.5" />
          </div>
        )}

        <Separator />

        {/* Config */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-medium">Personas</label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {localConfig.numPersonas}
              </span>
            </div>
            <Slider
              value={[localConfig.numPersonas]}
              onValueChange={([v]) => updateConfig({ numPersonas: v })}
              min={3}
              max={10}
              step={1}
              disabled={isRunning}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-medium">Max Iterations</label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {localConfig.maxIterations}
              </span>
            </div>
            <Slider
              value={[localConfig.maxIterations]}
              onValueChange={([v]) => updateConfig({ maxIterations: v })}
              min={2}
              max={5}
              step={1}
              disabled={isRunning}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-medium">Threshold</label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {localConfig.threshold.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[localConfig.threshold]}
              onValueChange={([v]) => updateConfig({ threshold: v })}
              min={5}
              max={9}
              step={0.5}
              disabled={isRunning}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
