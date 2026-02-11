"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IterationSummary } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface MetricsChartProps {
  summaries: IterationSummary[];
  threshold: number;
}

export function MetricsChart({ summaries, threshold }: MetricsChartProps) {
  if (summaries.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-balance">
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Run iterations to see metrics over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = summaries.map((s) => ({
    iteration: `Iter ${s.iteration}`,
    negotiation: s.avgNegotiationScore,
    relevance: s.avgRelevanceScore,
    overall: s.avgOverallScore,
  }));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-balance">
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="iteration"
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              domain={[0, 10]}
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              y={threshold}
              stroke="hsl(var(--destructive))"
              strokeDasharray="6 3"
              label={{
                value: `Threshold: ${threshold}`,
                position: "right",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Line
              type="monotone"
              dataKey="negotiation"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="Negotiation"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="relevance"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Relevance"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              name="Overall"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
