"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { OriComponentScores } from "@/lib/types";
import { COMPONENT_LABELS, ORI_WEIGHTS } from "@/lib/scoring";

export function ScoreBreakdownChart({
  components,
}: {
  components: OriComponentScores;
}) {
  const data = (Object.keys(components) as (keyof OriComponentScores)[]).map(
    (key) => ({
      name: COMPONENT_LABELS[key].replace(" ", "\n"),
      score: components[key],
      weight: ORI_WEIGHTS[key] * 100,
    })
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 9 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          formatter={(value, _name, props) => [
            `${value} (weight: ${(props.payload as { weight: number }).weight}%)`,
            "Score",
          ]}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.score >= 80
                  ? "#22c55e"
                  : entry.score >= 60
                    ? "#a1a1aa"
                    : entry.score >= 40
                      ? "#eab308"
                      : "#ef4444"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
