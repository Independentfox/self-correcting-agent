import fs from "fs";
import path from "path";
import type {
  BotScript,
  Persona,
  Conversation,
  ConversationTurn,
  Evaluation,
  FailureAnalysis,
  IterationSummary,
} from "./types";
import { callGroq, callGroqJSON, delay } from "./groq";
import {
  PERSONA_GENERATOR_PROMPT,
  BORROWER_SIMULATOR_PROMPT,
  JUDGE_PROMPT,
  FAILURE_AGGREGATOR_PROMPT,
  SCRIPT_REWRITER_PROMPT,
} from "./prompts";
import { calculateSummary } from "./metrics";
import { DEFAULT_CONFIG } from "./config";
import { logger } from "./logger";

const ROOT = process.cwd();

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function saveTo(iteration: number, filename: string, data: unknown) {
  const dir = path.join(ROOT, "output", `iteration-${iteration}`);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

function saveConversation(
  iteration: number,
  personaId: string,
  data: Conversation
) {
  const dir = path.join(
    ROOT,
    "output",
    `iteration-${iteration}`,
    "conversations"
  );
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, `${personaId}.json`),
    JSON.stringify(data, null, 2)
  );
}

export function loadScript(iteration: number): BotScript {
  if (iteration === 0) {
    const raw = fs.readFileSync(
      path.join(ROOT, "data", "base-script.json"),
      "utf-8"
    );
    return JSON.parse(raw);
  }
  const scriptPath = path.join(
    ROOT,
    "output",
    `iteration-${iteration}`,
    "script.json"
  );
  const raw = fs.readFileSync(scriptPath, "utf-8");
  return JSON.parse(raw);
}

export function loadSummary(iteration: number): IterationSummary | null {
  try {
    const raw = fs.readFileSync(
      path.join(ROOT, "output", `iteration-${iteration}`, "summary.json"),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadAllSummaries(): IterationSummary[] {
  const outputDir = path.join(ROOT, "output");
  if (!fs.existsSync(outputDir)) return [];
  const dirs = fs
    .readdirSync(outputDir)
    .filter((d) => d.startsWith("iteration-"))
    .sort(
      (a, b) =>
        parseInt(a.replace("iteration-", "")) -
        parseInt(b.replace("iteration-", ""))
    );
  const summaries: IterationSummary[] = [];
  for (const dir of dirs) {
    const summaryPath = path.join(outputDir, dir, "summary.json");
    if (fs.existsSync(summaryPath)) {
      summaries.push(JSON.parse(fs.readFileSync(summaryPath, "utf-8")));
    }
  }
  return summaries;
}

export function loadPersonas(iteration: number): Persona[] {
  try {
    const raw = fs.readFileSync(
      path.join(ROOT, "output", `iteration-${iteration}`, "personas.json"),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function loadConversation(
  iteration: number,
  personaId: string
): Conversation | null {
  try {
    const raw = fs.readFileSync(
      path.join(
        ROOT,
        "output",
        `iteration-${iteration}`,
        "conversations",
        `${personaId}.json`
      ),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadEvaluations(iteration: number): Evaluation[] {
  try {
    const raw = fs.readFileSync(
      path.join(ROOT, "output", `iteration-${iteration}`, "evaluations.json"),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function loadFailureAnalysis(
  iteration: number
): FailureAnalysis | null {
  try {
    const raw = fs.readFileSync(
      path.join(
        ROOT,
        "output",
        `iteration-${iteration}`,
        "failure-analysis.json"
      ),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Agent 1: Generate Personas ─────────────────────────────────────────

export async function generatePersonas(numPersonas: number): Promise<Persona[]> {
  logger.info("personas", `Generating ${numPersonas} personas...`);
  const start = Date.now();
  const mix = DEFAULT_CONFIG.personaMix;
  const messages = [
    { role: "system", content: PERSONA_GENERATOR_PROMPT },
    {
      role: "user",
      content: `Generate exactly ${numPersonas} personas. Include ${mix.easy} easy, ${mix.medium} medium, and ${mix.hard} hard difficulty personas. Make sure each persona ID follows the pattern "persona-0", "persona-1", etc.`,
    },
  ];

  const personas = (await callGroqJSON(messages)) as Persona[];
  const result = personas.map((p, i) => ({ ...p, id: `persona-${i}` }));
  logger.info("personas", `Generated ${result.length} personas in ${Date.now() - start}ms: ${result.map(p => `${p.name} (${p.difficulty})`).join(", ")}`);
  return result;
}

// ─── Agent 2+3: Simulate Conversation ──────────────────────────────────

export async function simulateConversation(
  script: BotScript,
  persona: Persona
): Promise<Conversation> {
  logger.info("conversation", `Starting conversation with ${persona.name} (${persona.difficulty}, ${persona.emotionalState})`);
  const convStart = Date.now();
  const botMessages: { role: string; content: string }[] = [
    { role: "system", content: script.content },
  ];
  const borrowerMessages: { role: string; content: string }[] = [
    { role: "system", content: BORROWER_SIMULATOR_PROMPT(persona, "") },
  ];

  const turns: ConversationTurn[] = [];

  // Bot opens the call
  const botOpener = `Hello, am I speaking with ${persona.name}? This is Priya calling from QuickLend Financial Services regarding your personal loan account.`;
  turns.push({ role: "bot", content: botOpener, turnNumber: 1 });

  botMessages.push({ role: "assistant", content: botOpener });
  borrowerMessages.push({ role: "user", content: botOpener });

  let turnNumber = 2;
  let outcome: Conversation["outcome"] = "unresolved";

  while (turnNumber <= DEFAULT_CONFIG.maxTurnsPerConversation) {
    // Borrower responds
    logger.debug("conversation", `  Turn ${turnNumber}: Borrower responding...`);
    await delay(500);
    const borrowerResponse = await callGroq(borrowerMessages, {
      temperature: DEFAULT_CONFIG.temperatureConversation,
    });
    turns.push({ role: "borrower", content: borrowerResponse, turnNumber });
    logger.debug("conversation", `  Turn ${turnNumber}: Borrower said: "${borrowerResponse.slice(0, 80)}..."`);

    // Check for termination
    if (borrowerResponse.includes("[HANGS UP]")) {
      outcome = "hung_up";
      logger.info("conversation", `  Borrower hung up at turn ${turnNumber}`);
      break;
    }
    if (borrowerResponse.includes("[AGREES TO PLAN]")) {
      outcome = "agreement_reached";
      logger.info("conversation", `  Agreement reached at turn ${turnNumber}`);
      break;
    }

    // Add to bot's context
    botMessages.push({ role: "user", content: borrowerResponse });
    turnNumber++;

    // Bot responds
    logger.debug("conversation", `  Turn ${turnNumber}: Bot responding...`);
    await delay(500);
    const botResponse = await callGroq(botMessages, {
      temperature: DEFAULT_CONFIG.temperatureConversation,
    });
    turns.push({ role: "bot", content: botResponse, turnNumber });
    logger.debug("conversation", `  Turn ${turnNumber}: Bot said: "${botResponse.slice(0, 80)}..."`);

    // Add to both histories
    borrowerMessages.push({ role: "assistant", content: borrowerResponse });
    borrowerMessages.push({ role: "user", content: botResponse });
    botMessages.push({ role: "assistant", content: botResponse });

    turnNumber++;
  }

  const elapsed = Date.now() - convStart;
  logger.info("conversation", `Conversation with ${persona.name} finished: ${turns.length} turns, outcome=${outcome}, ${elapsed}ms`);

  return {
    personaId: persona.id,
    turns,
    outcome,
    totalTurns: turns.length,
  };
}

// ─── Agent 4: Evaluate Conversation ────────────────────────────────────

export async function evaluateConversation(
  conversation: Conversation,
  persona: Persona
): Promise<Evaluation> {
  logger.info("judge", `Evaluating conversation for ${persona.name} (${conversation.totalTurns} turns, outcome=${conversation.outcome})`);
  const evalStart = Date.now();
  const transcript = conversation.turns
    .map(
      (t) =>
        `[Turn ${t.turnNumber}] ${t.role === "bot" ? "BOT" : "BORROWER"}: ${t.content}`
    )
    .join("\n");

  const personaInfo = `
Persona: ${persona.name} (${persona.difficulty} difficulty)
Situation: ${persona.financialSituation}
Emotional State: ${persona.emotionalState}
Tactics: ${persona.tactics.join(", ")}
Outcome: ${conversation.outcome}
`;

  const messages = [
    { role: "system", content: JUDGE_PROMPT },
    {
      role: "user",
      content: `PERSONA DETAILS:\n${personaInfo}\n\nTRANSCRIPT:\n${transcript}`,
    },
  ];

  await delay(500);
  const evaluation = (await callGroqJSON(messages)) as Omit<
    Evaluation,
    "personaId" | "conversationId"
  >;

  const result = {
    personaId: persona.id,
    conversationId: `${persona.id}-conv`,
    ...evaluation,
  };
  logger.info("judge", `Evaluation for ${persona.name}: overall=${result.overallScore}, negotiation=${result.metrics.negotiationEffectiveness.score}, relevance=${result.metrics.responseRelevance.score}, passed=${result.passed}, failures=${result.failures.length} (${Date.now() - evalStart}ms)`);
  return result;
}

// ─── Agent 5: Analyze Failures ─────────────────────────────────────────

export async function analyzeFailures(
  evaluations: Evaluation[]
): Promise<FailureAnalysis> {
  logger.info("failures", `Analyzing failures across ${evaluations.length} evaluations...`);
  const start = Date.now();
  const evalSummary = evaluations
    .map(
      (e) =>
        `Persona ${e.personaId}: Overall=${e.overallScore}, Negotiation=${e.metrics.negotiationEffectiveness.score}, Relevance=${e.metrics.responseRelevance.score}, Passed=${e.passed}\nFailures: ${JSON.stringify(e.failures)}`
    )
    .join("\n\n");

  const messages = [
    { role: "system", content: FAILURE_AGGREGATOR_PROMPT },
    {
      role: "user",
      content: `Here are the evaluation results from this iteration:\n\n${evalSummary}`,
    },
  ];

  await delay(500);
  const analysis = (await callGroqJSON(messages)) as FailureAnalysis;
  logger.info("failures", `Failure analysis complete in ${Date.now() - start}ms: ${analysis.patterns.length} patterns, ${analysis.prioritizedFixes.length} prioritized fixes`);
  for (const p of analysis.patterns) {
    logger.debug("failures", `  Pattern: ${p.pattern} (severity=${p.severity}, freq=${p.frequency})`);
  }
  return analysis;
}

// ─── Agent 6: Rewrite Script ───────────────────────────────────────────

export async function rewriteScript(
  currentScript: BotScript,
  failureAnalysis: FailureAnalysis,
  iteration: number
): Promise<BotScript> {
  logger.info("rewriter", `Rewriting script v${currentScript.version} based on ${failureAnalysis.patterns.length} failure patterns (iteration ${iteration})`);
  const start = Date.now();
  const failureStr = JSON.stringify(failureAnalysis, null, 2);
  const prompt = SCRIPT_REWRITER_PROMPT(
    currentScript.content,
    failureStr,
    iteration
  );

  const messages = [
    { role: "system", content: prompt },
    {
      role: "user",
      content:
        "Rewrite the script now. Output only the new script text, then ---CHANGES--- followed by bullet points.",
    },
  ];

  await delay(500);
  const response = await callGroq(messages, {
    temperature: DEFAULT_CONFIG.temperatureRewrite,
    maxTokens: 2048,
  });

  const parts = response.split("---CHANGES---");
  const newContent = parts[0].trim();
  const changesSummary = parts[1]?.trim() || "Script updated based on failure analysis";

  const newScript = {
    version: currentScript.version + 1,
    content: newContent,
    createdAt: new Date().toISOString(),
    parentVersion: currentScript.version,
    changesSummary,
  };
  logger.info("rewriter", `Script rewritten: v${currentScript.version} → v${newScript.version}, ${newContent.length} chars (${Date.now() - start}ms)`);
  logger.info("rewriter", `Changes: ${changesSummary.slice(0, 200)}`);
  return newScript;
}

// ─── Orchestrator: Run Full Iteration ──────────────────────────────────

export async function runIteration(
  iteration: number,
  numPersonas: number,
  threshold: number
): Promise<{
  done: boolean;
  reason?: string;
  summary: IterationSummary;
  nextIteration?: number;
}> {
  logger.info("orchestrator", `══════ ITERATION ${iteration} START ══════`);
  logger.info("orchestrator", `Config: ${numPersonas} personas, threshold=${threshold}`);
  const iterStart = Date.now();

  // 1. Load script
  logger.info("orchestrator", `Step 1/7: Loading script...`);
  const script = loadScript(iteration);
  logger.info("orchestrator", `Loaded script v${script.version} (${script.content.length} chars)`);
  saveTo(iteration, "script.json", script);

  // 2. Generate personas
  logger.info("orchestrator", `Step 2/7: Generating ${numPersonas} personas...`);
  const personas = await generatePersonas(numPersonas);
  saveTo(iteration, "personas.json", personas);

  // 3. Run conversations + evaluations
  logger.info("orchestrator", `Step 3/7: Running ${personas.length} conversations + evaluations...`);
  const evaluations: Evaluation[] = [];
  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    logger.info("orchestrator", `  Persona ${i + 1}/${personas.length}: ${persona.name} (${persona.difficulty})`);

    logger.info("orchestrator", `    Simulating conversation...`);
    const conversation = await simulateConversation(script, persona);
    saveConversation(iteration, persona.id, conversation);

    logger.info("orchestrator", `    Evaluating conversation...`);
    const evaluation = await evaluateConversation(conversation, persona);
    evaluations.push(evaluation);
    logger.info("orchestrator", `    Score: ${evaluation.overallScore} (${evaluation.passed ? "PASS" : "FAIL"})`);
  }
  saveTo(iteration, "evaluations.json", evaluations);

  // 4. Calculate summary
  logger.info("orchestrator", `Step 4/7: Calculating summary...`);
  const summary = calculateSummary(evaluations, iteration, script.version);
  saveTo(iteration, "summary.json", summary);
  logger.info("orchestrator", `Summary: overall=${summary.avgOverallScore}, negotiation=${summary.avgNegotiationScore}, relevance=${summary.avgRelevanceScore}, passRate=${summary.passRate}%`);

  // 5. Check threshold
  logger.info("orchestrator", `Step 5/7: Checking threshold (${summary.avgOverallScore} vs ${threshold})...`);
  if (summary.avgOverallScore >= threshold) {
    logger.info("orchestrator", `══════ ITERATION ${iteration} DONE — THRESHOLD MET (${Date.now() - iterStart}ms) ══════`);
    return { done: true, reason: "threshold_met", summary };
  }
  logger.info("orchestrator", `Below threshold, continuing to failure analysis...`);

  // 6. Analyze failures
  logger.info("orchestrator", `Step 6/7: Analyzing failures...`);
  const failureAnalysis = await analyzeFailures(evaluations);
  saveTo(iteration, "failure-analysis.json", failureAnalysis);

  // 7. Rewrite script for next iteration
  logger.info("orchestrator", `Step 7/7: Rewriting script...`);
  const newScript = await rewriteScript(script, failureAnalysis, iteration);
  saveTo(iteration + 1, "script.json", newScript);

  logger.info("orchestrator", `══════ ITERATION ${iteration} DONE (${Date.now() - iterStart}ms) — next: iteration ${iteration + 1} ══════`);
  return { done: false, summary, nextIteration: iteration + 1 };
}
