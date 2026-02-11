"use client";

import { useState, useCallback, useRef } from "react";
import { ScriptEditor } from "@/components/ScriptEditor";
import { PersonaList } from "@/components/PersonaList";
import { ConversationViewer } from "@/components/ConversationViewer";
import { MetricsChart } from "@/components/MetricsChart";
import { IterationTimeline } from "@/components/IterationTimeline";
import { RunControls } from "@/components/RunControls";
import { ScriptDiff } from "@/components/ScriptDiff";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type {
  BotScript,
  Persona,
  Conversation,
  Evaluation,
  IterationSummary,
  RunConfig,
} from "@/lib/types";
import { DEFAULT_CONFIG } from "@/lib/config";

export default function Dashboard() {
  // ─── State ──────────────────────────────────────────────────────────
  const [config, setConfig] = useState<RunConfig>({
    numPersonas: DEFAULT_CONFIG.numPersonas,
    maxIterations: DEFAULT_CONFIG.maxIterations,
    threshold: DEFAULT_CONFIG.threshold,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [currentIteration, setCurrentIteration] = useState(0);
  const [selectedIteration, setSelectedIteration] = useState(0);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null
  );

  const [scripts, setScripts] = useState<Map<number, BotScript>>(new Map());
  const [personas, setPersonas] = useState<Map<number, Persona[]>>(new Map());
  const [conversations, setConversations] = useState<
    Map<string, Conversation>
  >(new Map());
  const [evaluations, setEvaluations] = useState<Map<number, Evaluation[]>>(
    new Map()
  );
  const [summaries, setSummaries] = useState<IterationSummary[]>([]);

  const stopRef = useRef(false);

  // ─── Data Loading ───────────────────────────────────────────────────

  const loadIterationData = useCallback(async (iteration: number) => {
    try {
      const [scriptRes, personasRes, evalsRes] = await Promise.all([
        fetch(`/api/data?type=script&iteration=${iteration}`),
        fetch(`/api/data?type=personas&iteration=${iteration}`),
        fetch(`/api/data?type=evaluations&iteration=${iteration}`),
      ]);

      const scriptData = await scriptRes.json();
      const personasData = await personasRes.json();
      const evalsData = await evalsRes.json();

      if (scriptData.script) {
        setScripts((prev) => new Map(prev).set(iteration, scriptData.script));
      }
      if (personasData.personas) {
        setPersonas((prev) =>
          new Map(prev).set(iteration, personasData.personas)
        );
      }
      if (evalsData.evaluations) {
        setEvaluations((prev) =>
          new Map(prev).set(iteration, evalsData.evaluations)
        );
      }
    } catch {
      // Data may not exist yet
    }
  }, []);

  const loadConversation = useCallback(
    async (iteration: number, personaId: string) => {
      try {
        const res = await fetch(
          `/api/data?type=conversation&iteration=${iteration}&personaId=${personaId}`
        );
        const data = await res.json();
        if (data.conversation) {
          setConversations((prev) =>
            new Map(prev).set(`${iteration}-${personaId}`, data.conversation)
          );
        }
      } catch {
        // ignore
      }
    },
    []
  );

  // ─── Actions ────────────────────────────────────────────────────────

  const runSingleIteration = useCallback(async () => {
    setIsRunning(true);
    stopRef.current = false;
    setProgress(`Running iteration ${currentIteration}...`);

    try {
      const res = await fetch("/api/run-iteration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iteration: currentIteration,
          numPersonas: config.numPersonas,
          threshold: config.threshold,
        }),
      });

      const result = await res.json();

      if (result.error) {
        setProgress(`Error: ${result.error}`);
        setIsRunning(false);
        return;
      }

      // Update summaries
      setSummaries((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex(
          (s) => s.iteration === result.summary.iteration
        );
        if (idx >= 0) updated[idx] = result.summary;
        else updated.push(result.summary);
        return updated.sort((a, b) => a.iteration - b.iteration);
      });

      await loadIterationData(currentIteration);
      setSelectedIteration(currentIteration);

      if (result.done) {
        setProgress(
          `Threshold met! Score: ${result.summary.avgOverallScore.toFixed(1)}`
        );
      } else {
        setProgress(
          `Iteration ${currentIteration} complete. Score: ${result.summary.avgOverallScore.toFixed(1)}`
        );
        setCurrentIteration(result.nextIteration);
      }
    } catch (err) {
      setProgress(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }

    setIsRunning(false);
  }, [currentIteration, config, loadIterationData]);

  const runLoop = useCallback(async () => {
    setIsRunning(true);
    stopRef.current = false;
    let iteration = currentIteration;

    for (let i = 0; i < config.maxIterations; i++) {
      if (stopRef.current) {
        setProgress("Stopped by user.");
        break;
      }

      setProgress(
        `Iteration ${iteration} of ${config.maxIterations - 1 + currentIteration}...`
      );

      try {
        const res = await fetch("/api/run-iteration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            iteration,
            numPersonas: config.numPersonas,
            threshold: config.threshold,
          }),
        });

        const result = await res.json();

        if (result.error) {
          setProgress(`Error at iteration ${iteration}: ${result.error}`);
          break;
        }

        setSummaries((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex(
            (s) => s.iteration === result.summary.iteration
          );
          if (idx >= 0) updated[idx] = result.summary;
          else updated.push(result.summary);
          return updated.sort((a, b) => a.iteration - b.iteration);
        });

        await loadIterationData(iteration);
        setSelectedIteration(iteration);

        if (result.done) {
          setProgress(
            `Threshold met at iteration ${iteration}! Score: ${result.summary.avgOverallScore.toFixed(1)}`
          );
          setCurrentIteration(iteration + 1);
          break;
        }

        iteration = result.nextIteration;
        setCurrentIteration(iteration);
      } catch (err) {
        setProgress(
          `Error: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        break;
      }
    }

    setIsRunning(false);
  }, [currentIteration, config, loadIterationData]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const handleReset = useCallback(() => {
    setCurrentIteration(0);
    setSelectedIteration(0);
    setSelectedPersonaId(null);
    setScripts(new Map());
    setPersonas(new Map());
    setConversations(new Map());
    setEvaluations(new Map());
    setSummaries([]);
    setProgress("");
  }, []);

  const handleSelectPersona = useCallback(
    (personaId: string) => {
      setSelectedPersonaId(personaId);
      loadConversation(selectedIteration, personaId);
    },
    [selectedIteration, loadConversation]
  );

  const handleSelectIteration = useCallback(
    (iteration: number) => {
      setSelectedIteration(iteration);
      setSelectedPersonaId(null);
      loadIterationData(iteration);
    },
    [loadIterationData]
  );

  // ─── Derived State ──────────────────────────────────────────────────

  const currentScript = scripts.get(selectedIteration) ?? null;
  const prevScript =
    selectedIteration > 0
      ? scripts.get(selectedIteration - 1) ?? null
      : null;
  const currentPersonas = personas.get(selectedIteration) ?? [];
  const currentEvaluations = evaluations.get(selectedIteration) ?? [];
  const selectedConversation = selectedPersonaId
    ? conversations.get(`${selectedIteration}-${selectedPersonaId}`) ?? null
    : null;
  const selectedPersona =
    currentPersonas.find((p) => p.id === selectedPersonaId) ?? null;
  const selectedEvaluation =
    currentEvaluations.find((e) => e.personaId === selectedPersonaId) ?? null;

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-balance">
              VoiceTest
            </h1>
            <p className="text-xs text-muted-foreground">
              Self-Correcting Voice Agent Testing Platform
            </p>
          </div>
          {summaries.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Latest Score</span>
                <p className="font-medium tabular-nums">
                  {summaries[summaries.length - 1].avgOverallScore.toFixed(1)}
                </p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <span className="text-muted-foreground">Iterations</span>
                <p className="font-medium tabular-nums">{summaries.length}</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <span className="text-muted-foreground">Pass Rate</span>
                <p className="font-medium tabular-nums">
                  {summaries[summaries.length - 1].passRate.toFixed(0)}%
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Controls */}
        <RunControls
          config={config}
          onConfigChange={setConfig}
          onRunSingle={runSingleIteration}
          onRunLoop={runLoop}
          onStop={handleStop}
          onReset={handleReset}
          isRunning={isRunning}
          progress={progress}
          currentIteration={currentIteration}
        />

        {/* Top Row: Script + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Tabs defaultValue="script">
            <TabsList>
              <TabsTrigger value="script">Script</TabsTrigger>
              <TabsTrigger value="diff">Diff</TabsTrigger>
            </TabsList>
            <TabsContent value="script" className="mt-3">
              <ScriptEditor
                script={currentScript}
                isRunning={isRunning}
              />
            </TabsContent>
            <TabsContent value="diff" className="mt-3">
              <ScriptDiff
                oldScript={prevScript}
                newScript={currentScript}
              />
            </TabsContent>
          </Tabs>

          <MetricsChart
            summaries={summaries}
            threshold={config.threshold}
          />
        </div>

        {/* Bottom Row: Timeline + Conversation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IterationTimeline
            summaries={summaries}
            selectedIteration={selectedIteration}
            onSelectIteration={handleSelectIteration}
          />

          <ConversationViewer
            conversation={selectedConversation}
            evaluation={selectedEvaluation}
            persona={selectedPersona}
          />
        </div>

        {/* Personas */}
        <PersonaList
          personas={currentPersonas}
          evaluations={currentEvaluations}
          selectedPersonaId={selectedPersonaId}
          onSelectPersona={handleSelectPersona}
        />
      </main>
    </div>
  );
}
