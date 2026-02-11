# Self-Correcting Voice Agent Testing Platform — Build Handover

## Project Overview

Build a Cekura-like AI-automated testing platform for debt collection voice agents. The platform generates diverse loan defaulter personas, simulates conversations against a bot's script, evaluates performance on 2 metrics, identifies failures, rewrites the script, and loops until a threshold is met.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **LLM**: Groq API (free tier — use `llama-3.3-70b-versatile` or `llama-3.1-70b-versatile`)
- **UI**: shadcn/ui + Tailwind CSS
- **Storage**: Local JSON files in `/data` and `/output` folders
- **No database. No auth. No deployment.**

---

## Folder Structure

```
project-root/
├── app/
│   ├── page.tsx                    # Main dashboard
│   ├── layout.tsx
│   └── api/
│       ├── generate-personas/
│       │   └── route.ts            # POST — generates N personas
│       ├── run-test/
│       │   └── route.ts            # POST — runs one conversation simulation
│       ├── evaluate/
│       │   └── route.ts            # POST — judge evaluates a transcript
│       ├── analyze-failures/
│       │   └── route.ts            # POST — aggregates failures across tests
│       ├── rewrite-script/
│       │   └── route.ts            # POST — rewrites the bot script
│       └── run-iteration/
│           └── route.ts            # POST — orchestrates one full iteration
├── components/
│   ├── ScriptEditor.tsx            # Shows/edits current bot script
│   ├── PersonaList.tsx             # Shows generated personas
│   ├── ConversationViewer.tsx      # Shows simulated conversation transcript
│   ├── MetricsChart.tsx            # Line chart of scores across iterations
│   ├── IterationTimeline.tsx       # Shows iteration history with diffs
│   ├── RunControls.tsx             # Buttons: Run Tests, Run Loop, Stop
│   └── ScriptDiff.tsx              # Side-by-side diff of script changes
├── lib/
│   ├── groq.ts                     # Groq client setup
│   ├── prompts.ts                  # ALL system prompts live here
│   ├── types.ts                    # TypeScript interfaces
│   ├── metrics.ts                  # Metric definitions and rubrics
│   └── orchestrator.ts             # Core loop logic (can be shared)
├── data/
│   ├── base-script.json            # The initial bot script (seed)
│   └── personas/                   # (optional) pre-made personas
├── output/
│   ├── iteration-0/
│   │   ├── script.json             # Script used in this iteration
│   │   ├── personas.json           # Personas tested
│   │   ├── conversations/
│   │   │   ├── persona-0.json      # Full transcript
│   │   │   ├── persona-1.json
│   │   │   └── ...
│   │   ├── evaluations.json        # Judge scores + feedback per convo
│   │   ├── failure-analysis.json   # Aggregated failure patterns
│   │   └── summary.json            # Avg scores, pass/fail, metadata
│   ├── iteration-1/
│   │   ├── script.json             # REWRITTEN script
│   │   ├── ...
│   └── final-report.json           # Overall improvement summary
├── public/
└── package.json
```

---

## TypeScript Interfaces (`lib/types.ts`)

```typescript
export interface BotScript {
  version: number;
  content: string;          // The full system prompt for the debt collection bot
  createdAt: string;
  parentVersion: number | null;
  changesSummary: string | null;
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  occupation: string;
  loanAmount: number;
  monthsOverdue: number;
  financialSituation: string;      // "lost job", "medical emergency", "willful defaulter"
  emotionalState: string;          // "angry", "anxious", "evasive", "cooperative", "hostile"
  tactics: string[];               // ["threatens legal action", "keeps changing topic", "cries"]
  backstory: string;               // 2-3 line backstory for the LLM to roleplay
  difficulty: "easy" | "medium" | "hard";
}

export interface ConversationTurn {
  role: "bot" | "borrower";
  content: string;
  turnNumber: number;
}

export interface Conversation {
  personaId: string;
  turns: ConversationTurn[];
  outcome: "agreement_reached" | "call_ended" | "escalation" | "hung_up" | "unresolved";
  totalTurns: number;
}

export interface Evaluation {
  personaId: string;
  conversationId: string;
  metrics: {
    negotiationEffectiveness: MetricScore;
    responseRelevance: MetricScore;
  };
  overallScore: number;           // avg of both metrics
  failures: FailurePoint[];
  passed: boolean;                // overallScore >= threshold
}

export interface MetricScore {
  score: number;                  // 1-10
  reasoning: string;
  examples: string[];             // specific turn references
}

export interface FailurePoint {
  turnNumber: number;
  metric: string;
  description: string;
  severity: "low" | "medium" | "high";
  suggestedFix: string;
}

export interface IterationSummary {
  iteration: number;
  scriptVersion: number;
  avgNegotiationScore: number;
  avgRelevanceScore: number;
  avgOverallScore: number;
  passRate: number;               // % of conversations that passed
  totalPersonas: number;
  failurePatterns: string[];
  timestamp: string;
}
```

---

## The 5 Agents — System Prompts (`lib/prompts.ts`)

### Agent 1: Persona Generator

```typescript
export const PERSONA_GENERATOR_PROMPT = `You are a test persona generator for a debt collection voice agent testing platform.

Generate realistic, diverse loan defaulter personas that will stress-test a debt collection bot. Each persona should present a unique challenge.

IMPORTANT RULES:
- Create personas across a spectrum of difficulty (easy, medium, hard)
- Hard personas should use adversarial tactics: threatening legal action, emotional manipulation, topic changing, denial, aggression, demanding supervisors
- Medium personas have legitimate hardship but are somewhat cooperative
- Easy personas are cooperative but need gentle handling
- Make backstories specific and realistic (Indian context — mention cities, job types, family situations)
- Vary loan amounts between ₹20,000 to ₹5,00,000
- Vary overdue periods from 1 month to 12+ months

OUTPUT FORMAT: Return a JSON array of persona objects. Nothing else. No markdown.
[
  {
    "id": "persona-0",
    "name": "...",
    "age": ...,
    "occupation": "...",
    "loanAmount": ...,
    "monthsOverdue": ...,
    "financialSituation": "...",
    "emotionalState": "...",
    "tactics": ["..."],
    "backstory": "...",
    "difficulty": "easy|medium|hard"
  }
]`;
```

### Agent 2: Debt Collection Bot (The Agent Under Test)

This is the **base script** that goes in `data/base-script.json` and gets rewritten each iteration:

```json
{
  "version": 0,
  "content": "You are a professional debt collection agent working for QuickLend Financial Services. You are calling a borrower who has defaulted on their personal loan.\n\nYOUR DETAILS:\n- Company: QuickLend Financial Services\n- Your name: Priya from QuickLend\n- Loan type: Personal Loan\n\nYOUR OBJECTIVES (in order of priority):\n1. Confirm you are speaking with the right person\n2. Inform them of their outstanding dues\n3. Understand their current financial situation\n4. Negotiate a repayment plan (full payment preferred, EMI restructuring acceptable)\n5. Get a commitment with a specific date\n6. If no resolution, inform about escalation consequences\n\nTONE & RULES:\n- Be professional, firm but empathetic\n- Never threaten or use abusive language\n- Listen to the borrower's concerns\n- Always offer at least one alternative payment option\n- If the borrower gets aggressive, stay calm and redirect\n- End every call with a clear next step\n\nIMPORTANT: You are in a phone conversation. Keep responses concise (2-4 sentences max). Sound natural, not scripted. Use the borrower's name.",
  "createdAt": "2025-01-01T00:00:00Z",
  "parentVersion": null,
  "changesSummary": null
}
```

### Agent 3: Borrower Simulator

```typescript
export const BORROWER_SIMULATOR_PROMPT = (persona: Persona, loanContext: string) => `
You are roleplaying as a loan defaulter receiving a debt collection call. Stay FULLY in character throughout the conversation.

YOUR IDENTITY:
- Name: ${persona.name}
- Age: ${persona.age}
- Occupation: ${persona.occupation}
- Loan Amount: ₹${persona.loanAmount.toLocaleString()}
- Months Overdue: ${persona.monthsOverdue}
- Your Situation: ${persona.financialSituation}
- Your Emotional State: ${persona.emotionalState}
- Tactics You Use: ${persona.tactics.join(", ")}
- Backstory: ${persona.backstory}

HOW TO BEHAVE:
- Respond naturally as this person would on a phone call
- Use the tactics listed above organically (don't force all of them)
- Keep responses SHORT (1-3 sentences) — this is a phone call
- React emotionally when appropriate
- If your character would hang up, say "[HANGS UP]"
- If you reach a genuine agreement, say "[AGREES TO PLAN]"
- You can lie, deflect, get angry, cry, whatever fits your character
- NEVER break character. You ARE this person.

${loanContext ? `ADDITIONAL CONTEXT: ${loanContext}` : ""}
`;
```

### Agent 4: Judge / Evaluator

```typescript
export const JUDGE_PROMPT = `You are an expert evaluator for debt collection voice agent performance. You will be given a conversation transcript between a debt collection bot and a simulated borrower, along with the borrower's persona details.

Evaluate the bot on exactly TWO metrics:

## METRIC 1: Negotiation Effectiveness (1-10)
How well did the bot work toward a resolution?

SCORING RUBRIC:
- 9-10: Bot successfully adapted strategy, offered alternatives, got commitment or clear next step
- 7-8: Bot made reasonable negotiation attempts, offered options, but missed some opportunities
- 5-6: Bot attempted to negotiate but was rigid or repetitive in approach
- 3-4: Bot barely negotiated, mostly just stated demands
- 1-2: Bot failed to negotiate at all, or gave up immediately

WHAT TO LOOK FOR:
- Did the bot offer payment plans / restructuring?
- Did the bot adapt when initial approach didn't work?
- Did the bot pick up on the borrower's situation and adjust?
- Did the bot escalate appropriately (not too early, not too late)?
- Did the conversation move toward a resolution?

## METRIC 2: Response Relevance (1-10)
Did the bot actually address what the borrower said?

SCORING RUBRIC:
- 9-10: Every response directly addressed the borrower's statements and concerns
- 7-8: Mostly relevant, occasional generic/canned responses
- 5-6: Mixed — some relevant, some clearly off-topic or ignoring what was said
- 3-4: Frequently ignored borrower's actual words, gave scripted responses
- 1-2: Almost entirely irrelevant, bot seemed to be talking to itself

WHAT TO LOOK FOR:
- When borrower mentioned a specific hardship, did bot acknowledge it?
- When borrower asked a question, did bot answer it?
- Did bot repeat itself unnecessarily?
- Did bot respond appropriately to emotional cues?
- Did bot handle topic changes / deflections gracefully?

OUTPUT FORMAT (strict JSON, no markdown):
{
  "metrics": {
    "negotiationEffectiveness": {
      "score": <number 1-10>,
      "reasoning": "<2-3 sentences>",
      "examples": ["Turn X: <what happened>", "Turn Y: <what happened>"]
    },
    "responseRelevance": {
      "score": <number 1-10>,
      "reasoning": "<2-3 sentences>",
      "examples": ["Turn X: <what happened>", "Turn Y: <what happened>"]
    }
  },
  "overallScore": <average of both scores>,
  "failures": [
    {
      "turnNumber": <number>,
      "metric": "negotiationEffectiveness|responseRelevance",
      "description": "<what went wrong>",
      "severity": "low|medium|high",
      "suggestedFix": "<what the bot should have done>"
    }
  ],
  "passed": <true if overallScore >= 7.0>
}`;
```

### Agent 5: Script Rewriter (Self-Corrector)

```typescript
export const SCRIPT_REWRITER_PROMPT = (currentScript: string, failureAnalysis: string, iterationNumber: number) => `
You are an expert prompt engineer specializing in conversational AI for debt collection.

You are given:
1. The CURRENT system prompt (script) for a debt collection voice agent
2. A FAILURE ANALYSIS showing patterns of where the bot failed across multiple test conversations
3. This is iteration #${iterationNumber} of the improvement loop

YOUR TASK:
Rewrite the bot's system prompt to fix the identified failures while preserving what already works.

CURRENT SCRIPT:
---
${currentScript}
---

FAILURE ANALYSIS:
---
${failureAnalysis}
---

REWRITING RULES:
- ADD specific handling instructions for each failure pattern identified
- DON'T remove instructions that are already working well
- ADD example phrases the bot can use for tricky situations
- ADD edge case handling (e.g., "if the borrower threatens legal action, respond with...")
- KEEP the same structure and tone directives
- MAKE the script MORE specific, not more generic
- Each iteration should make the script LONGER and MORE detailed (within reason)
- Include concrete response templates for the most common failure scenarios

OUTPUT FORMAT: Return ONLY the new script text. No commentary, no markdown wrapping. Just the raw prompt text that will be used as the system prompt.

Also output a brief changes summary at the very end, after a line containing only "---CHANGES---":
<the new script text>
---CHANGES---
<2-3 bullet points of what was changed and why>
`;
```

### Agent 6: Failure Aggregator

```typescript
export const FAILURE_AGGREGATOR_PROMPT = `You are an analyst reviewing multiple conversation evaluations from a debt collection bot testing session.

You will receive all evaluation results from this iteration. Your job is to identify PATTERNS in failures — not just list individual failures.

Look for:
1. Recurring failure modes (e.g., "bot always fails when borrower gets emotional")
2. Systematic weaknesses (e.g., "bot never offers EMI restructuring")
3. Scenario gaps (e.g., "bot doesn't know how to handle legal threats")
4. Tone issues (e.g., "bot becomes too aggressive with difficult personas")

OUTPUT FORMAT (strict JSON, no markdown):
{
  "patterns": [
    {
      "pattern": "<description of the pattern>",
      "frequency": "<how many conversations showed this>",
      "severity": "low|medium|high",
      "affectedPersonaTypes": ["<which persona types triggered this>"],
      "rootCause": "<why this is happening>",
      "suggestedFix": "<specific instruction to add to the script>"
    }
  ],
  "strengths": ["<what the bot is doing well — preserve these>"],
  "prioritizedFixes": ["<ordered list of the top 3-5 things to fix, most important first>"]
}`;
```

---

## Core Flow — The Orchestrator

This is the main logic. It can live in `lib/orchestrator.ts` or be driven by `api/run-iteration/route.ts`.

```
ORCHESTRATOR FLOW:
══════════════════

INPUT: base-script.json, config (numPersonas=6, maxIterations=4, threshold=7.5)

FOR iteration = 0 to maxIterations:
│
├─ 1. LOAD current script
│     (iteration 0 → data/base-script.json)
│     (iteration N → output/iteration-{N-1}/rewritten-script.json)
│
├─ 2. GENERATE PERSONAS  [Persona Generator Agent]
│     → Call Groq with PERSONA_GENERATOR_PROMPT
│     → Request `numPersonas` personas (mix of easy/medium/hard)
│     → Parse JSON response
│     → Save to output/iteration-{N}/personas.json
│
├─ 3. FOR EACH persona:
│  │
│  ├─ 3a. SIMULATE CONVERSATION  [Bot + Borrower Agents]
│  │     → Initialize two message arrays
│  │     → Bot starts: "Hello, am I speaking with {persona.name}?"
│  │     → Loop for max 20 turns:
│  │         → Send borrower persona's messages to Groq (borrower agent)
│  │         → Send borrower's reply to Groq (bot agent with current script)
│  │         → Check for termination signals: [HANGS UP], [AGREES TO PLAN],
│  │           or natural conversation end
│  │     → Determine outcome
│  │     → Save to output/iteration-{N}/conversations/persona-{id}.json
│  │
│  └─ 3b. EVALUATE CONVERSATION  [Judge Agent]
│        → Send full transcript + persona details to Groq with JUDGE_PROMPT
│        → Parse scores and failures
│        → Save evaluation
│
├─ 4. AGGREGATE EVALUATIONS
│     → Collect all evaluations for this iteration
│     → Save to output/iteration-{N}/evaluations.json
│     → Calculate averages
│
├─ 5. CHECK THRESHOLD
│     → IF avgOverallScore >= threshold: STOP ✅
│     → IF iteration == maxIterations: STOP (max reached) ⚠️
│     → ELSE: continue to step 6
│
├─ 6. ANALYZE FAILURES  [Failure Aggregator Agent]
│     → Send all evaluations to Groq with FAILURE_AGGREGATOR_PROMPT
│     → Identify patterns
│     → Save to output/iteration-{N}/failure-analysis.json
│
├─ 7. REWRITE SCRIPT  [Script Rewriter Agent]
│     → Send current script + failure analysis to Groq with SCRIPT_REWRITER_PROMPT
│     → Get rewritten script
│     → Save as output/iteration-{N+1}/script.json (with incremented version)
│
└─ 8. SAVE ITERATION SUMMARY
      → output/iteration-{N}/summary.json
      → { iteration, scores, passRate, failurePatterns, timestamp }

OUTPUT: final-report.json with all iteration summaries + improvement graph data
```

---

## API Routes — Implementation Notes

### `POST /api/run-iteration`

This is the main endpoint. The frontend calls this and it orchestrates one full iteration.

```typescript
// Pseudocode for the route handler
export async function POST(req: Request) {
  const { iteration, scriptVersion, config } = await req.json();
  
  // 1. Load script
  const script = loadScript(iteration);
  
  // 2. Generate personas
  const personas = await generatePersonas(config.numPersonas);
  saveToOutput(iteration, 'personas.json', personas);
  
  // 3. Run conversations + evaluations
  const results = [];
  for (const persona of personas) {
    const conversation = await simulateConversation(script, persona);
    saveConversation(iteration, persona.id, conversation);
    
    const evaluation = await evaluateConversation(conversation, persona);
    results.push(evaluation);
  }
  saveToOutput(iteration, 'evaluations.json', results);
  
  // 4. Calculate summary
  const summary = calculateSummary(results, iteration);
  saveToOutput(iteration, 'summary.json', summary);
  
  // 5. Check if we need to continue
  if (summary.avgOverallScore >= config.threshold) {
    return Response.json({ done: true, reason: 'threshold_met', summary });
  }
  
  // 6. Analyze failures
  const failureAnalysis = await analyzeFailures(results);
  saveToOutput(iteration, 'failure-analysis.json', failureAnalysis);
  
  // 7. Rewrite script
  const newScript = await rewriteScript(script, failureAnalysis, iteration);
  saveScript(iteration + 1, newScript);
  
  return Response.json({ done: false, summary, nextIteration: iteration + 1 });
}
```

### Conversation Simulation Logic

```typescript
async function simulateConversation(script: BotScript, persona: Persona): Promise<Conversation> {
  const botMessages = [{ role: "system", content: script.content }];
  const borrowerMessages = [{ role: "system", content: BORROWER_SIMULATOR_PROMPT(persona, "") }];
  
  const turns: ConversationTurn[] = [];
  
  // Bot opens the call
  const botOpener = `Hello, am I speaking with ${persona.name}? This is Priya calling from QuickLend Financial Services.`;
  turns.push({ role: "bot", content: botOpener, turnNumber: 1 });
  
  // Add bot's opener to borrower's context
  borrowerMessages.push({ role: "user", content: botOpener });
  
  let turnNumber = 2;
  let outcome: Conversation["outcome"] = "unresolved";
  
  while (turnNumber <= 20) {
    // Borrower responds
    const borrowerResponse = await callGroq(borrowerMessages);
    turns.push({ role: "borrower", content: borrowerResponse, turnNumber });
    
    // Check for termination
    if (borrowerResponse.includes("[HANGS UP]")) { outcome = "hung_up"; break; }
    if (borrowerResponse.includes("[AGREES TO PLAN]")) { outcome = "agreement_reached"; break; }
    
    // Add to bot's context
    botMessages.push({ role: "user", content: borrowerResponse });
    turnNumber++;
    
    // Bot responds
    const botResponse = await callGroq(botMessages);
    turns.push({ role: "bot", content: botResponse, turnNumber });
    
    // Add to borrower's context
    borrowerMessages.push({ role: "assistant", content: borrowerResponse });
    borrowerMessages.push({ role: "user", content: botResponse });
    botMessages.push({ role: "assistant", content: botResponse });
    
    turnNumber++;
  }
  
  return { personaId: persona.id, turns, outcome, totalTurns: turns.length };
}
```

---

## Groq Client Setup (`lib/groq.ts`)

```typescript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function callGroq(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: messages as any,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  });
  return response.choices[0]?.message?.content || "";
}

// For JSON responses (personas, evaluations), use lower temperature
export async function callGroqJSON(
  messages: { role: string; content: string }[]
): Promise<any> {
  const response = await callGroq(messages, { temperature: 0.3 });
  // Strip markdown code fences if present
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
```

---

## Frontend — Page Layout

### Main Dashboard (`app/page.tsx`)

```
┌────────────────────────────────────────────────────────────┐
│  HEADER: "VoiceTest — Self-Correcting Agent Platform"      │
│  [Run Single Test]  [Run Full Loop]  [Stop]  [Reset]       │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                 │
│  SCRIPT EDITOR           │  METRICS CHART                  │
│  Current bot script      │  Line chart: scores per         │
│  with version badge      │  iteration (negotiation +       │
│  Read-only during run    │  relevance + overall)           │
│                          │                                 │
├──────────────────────────┼─────────────────────────────────┤
│                          │                                 │
│  ITERATION TIMELINE      │  CONVERSATION VIEWER            │
│  Cards for each          │  Select a persona → see full    │
│  iteration showing:      │  transcript with color-coded    │
│  - Version number        │  turns (bot = blue,             │
│  - Avg scores            │  borrower = gray)               │
│  - Pass rate             │  Show eval scores inline        │
│  - Changes summary       │                                 │
│  Click to expand diff    │                                 │
│                          │                                 │
├──────────────────────────┴─────────────────────────────────┤
│  PERSONA GRID                                              │
│  Cards showing each persona with: name, difficulty badge,  │
│  situation summary, score badges (green/yellow/red)        │
└────────────────────────────────────────────────────────────┘
```

### Key UI Components

**RunControls.tsx**: 
- "Run Single Iteration" — runs one full test cycle, shows results
- "Run Self-Correction Loop" — runs iterations until threshold/max
- Progress indicator showing: "Iteration 2/4 — Testing persona 3/6..."
- Config inputs: num personas (3-10), max iterations (2-5), threshold (5-9)

**MetricsChart.tsx**:
- Use recharts (already in shadcn)
- X-axis: Iteration number
- Y-axis: Score (1-10)
- Three lines: Negotiation, Relevance, Overall
- Horizontal dashed line at threshold

**ScriptDiff.tsx**:
- Simple side-by-side or inline diff
- Can use a basic string diff — highlight added lines in green, removed in red
- Or just show "Changes Summary" from the rewriter

**ConversationViewer.tsx**:
- Chat bubble UI (bot on left, borrower on right)
- Each bubble shows turn number
- Failed turns highlighted with red border + failure tooltip
- Outcome badge at the bottom

---

## Configuration Constants

```typescript
// lib/config.ts
export const DEFAULT_CONFIG = {
  numPersonas: 6,
  maxIterations: 4,
  threshold: 7.5,
  maxTurnsPerConversation: 20,
  personaMix: { easy: 1, medium: 2, hard: 3 },
  groqModel: "llama-3.3-70b-versatile",
  temperatureConversation: 0.7,
  temperatureEvaluation: 0.2,
  temperatureRewrite: 0.4,
};
```

---

## Build Order (4-Hour Plan)

### Hour 1: Foundation (0:00–1:00)
1. `npx create-next-app@latest` with TypeScript + Tailwind + App Router
2. `npx shadcn@latest init` + install components: card, button, badge, tabs, textarea, slider, progress
3. Set up `lib/groq.ts`, `lib/types.ts`, `lib/prompts.ts`
4. Create `data/base-script.json` with the seed script
5. Build `POST /api/generate-personas` — test it with curl
6. Build `POST /api/run-test` (single conversation simulation) — test it

### Hour 2: Core Loop (1:00–2:00)
7. Build `POST /api/evaluate` (judge agent)
8. Build `POST /api/analyze-failures` (failure aggregator)
9. Build `POST /api/rewrite-script` (script rewriter)
10. Build `POST /api/run-iteration` (orchestrator that chains them all)
11. Wire up file I/O — reading/writing to `data/` and `output/` folders
12. Test the full loop once via API calls (no UI yet)

### Hour 3: Frontend (2:00–3:00)
13. Build the main dashboard layout
14. ScriptEditor component (show current script, version badge)
15. RunControls component (buttons + config)
16. ConversationViewer component (chat bubbles)
17. PersonaList component (cards grid)
18. Wire up frontend to API routes with fetch + loading states

### Hour 4: Polish + Self-Correction Loop (3:00–4:00)
19. MetricsChart with recharts (the money shot for the demo)
20. IterationTimeline showing improvement across iterations
21. ScriptDiff component
22. Full loop mode: frontend drives multiple iterations automatically
23. Handle edge cases (Groq rate limits, JSON parse failures)
24. Record the Loom

---

## Groq Rate Limit Strategy

Groq free tier has limits. To stay within them:
- Keep `numPersonas` at 5-6 (not 10)
- Add 500ms delays between Groq calls (`await new Promise(r => setTimeout(r, 500))`)
- Use `llama-3.3-70b-versatile` — it's fast and capable enough
- If rate limited, catch the error and retry after 5 seconds
- For the demo: pre-run 2-3 iterations, cache the results in `output/`, then show the UI populated with real data

---

## Key Gotchas & Tips

1. **JSON parsing from LLMs**: Groq/Llama will sometimes wrap JSON in markdown code fences or add commentary. ALWAYS strip ```json and ``` before parsing. Add a try-catch with a retry on parse failure.

2. **Conversation message format**: The bot and borrower each have their own message history. The bot sees borrower messages as `role: "user"` and its own as `role: "assistant"`. Vice versa for borrower. Don't mix them up.

3. **Persona diversity**: Explicitly request the difficulty mix in your persona generator call: "Generate 1 easy, 2 medium, and 3 hard personas."

4. **Script rewriter drift**: The rewriter might make the script too long or start removing things. Emphasize "ADD, don't remove" and cap the script at ~1500 words.

5. **Output folder structure**: Create directories recursively. Use `fs.mkdirSync(path, { recursive: true })`.

6. **Demo prep**: Run the full loop at least once before recording. If Groq is slow, have cached results ready.

---

## What Makes This Stand Out in a Demo

- **The improvement chart** — showing scores going from ~4 to ~8 across iterations
- **The script diff** — showing exactly what the self-correction added
- **Diverse personas** — the angry borrower, the crying one, the legal threatener
- **Concrete failure → fix mapping** — "Failed on legal threats (iter 1) → Added handling (iter 2) → Passes (iter 2)"
- **Clean UI** — even a simple well-styled dashboard beats a terminal demo