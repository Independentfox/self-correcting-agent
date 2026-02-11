export interface BotScript {
  version: number;
  content: string;
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
  financialSituation: string;
  emotionalState: string;
  tactics: string[];
  backstory: string;
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
  outcome:
    | "agreement_reached"
    | "call_ended"
    | "escalation"
    | "hung_up"
    | "unresolved";
  totalTurns: number;
}

export interface Evaluation {
  personaId: string;
  conversationId: string;
  metrics: {
    negotiationEffectiveness: MetricScore;
    responseRelevance: MetricScore;
  };
  overallScore: number;
  failures: FailurePoint[];
  passed: boolean;
}

export interface MetricScore {
  score: number;
  reasoning: string;
  examples: string[];
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
  passRate: number;
  totalPersonas: number;
  failurePatterns: string[];
  timestamp: string;
}

export interface FailurePattern {
  pattern: string;
  frequency: string;
  severity: "low" | "medium" | "high";
  affectedPersonaTypes: string[];
  rootCause: string;
  suggestedFix: string;
}

export interface FailureAnalysis {
  patterns: FailurePattern[];
  strengths: string[];
  prioritizedFixes: string[];
}

export interface IterationResult {
  done: boolean;
  reason?: "threshold_met" | "max_iterations" | "error";
  summary: IterationSummary;
  nextIteration?: number;
  error?: string;
}

export interface RunConfig {
  numPersonas: number;
  maxIterations: number;
  threshold: number;
}
