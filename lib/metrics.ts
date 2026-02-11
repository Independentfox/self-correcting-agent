import type { Evaluation, IterationSummary } from "./types";

export function calculateSummary(
  evaluations: Evaluation[],
  iteration: number,
  scriptVersion: number
): IterationSummary {
  const totalPersonas = evaluations.length;

  const avgNegotiationScore =
    evaluations.reduce(
      (sum, e) => sum + e.metrics.negotiationEffectiveness.score,
      0
    ) / totalPersonas;

  const avgRelevanceScore =
    evaluations.reduce(
      (sum, e) => sum + e.metrics.responseRelevance.score,
      0
    ) / totalPersonas;

  const avgOverallScore =
    evaluations.reduce((sum, e) => sum + e.overallScore, 0) / totalPersonas;

  const passRate =
    (evaluations.filter((e) => e.passed).length / totalPersonas) * 100;

  const failurePatterns = evaluations
    .flatMap((e) => e.failures)
    .map((f) => f.description)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 10);

  return {
    iteration,
    scriptVersion,
    avgNegotiationScore: Math.round(avgNegotiationScore * 100) / 100,
    avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100,
    avgOverallScore: Math.round(avgOverallScore * 100) / 100,
    passRate: Math.round(passRate * 100) / 100,
    totalPersonas,
    failurePatterns,
    timestamp: new Date().toISOString(),
  };
}
