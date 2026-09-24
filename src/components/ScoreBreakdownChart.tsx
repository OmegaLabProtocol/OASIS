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
import { ORI_CATEGORY_LABELS, ORI_CATEGORY_WEIGHTS } from "@/lib/ori/methodology";
import type { OriCategoryScores } from "@/lib/data/types";

export function ScoreBreakdownChart({
  categoryScores,
}: {
  categoryScores: OriCategoryScores;
}) {
  const data = (Object.keys(categoryScores) as (keyof OriCategoryScores)[]).map(
    (key) => ({
      name: ORI_CATEGORY_LABELS[key],
      score: categoryScores[key] ?? 0,
      available: categoryScores[key] != null,
      weight: ORI_CATEGORY_WEIGHTS[key] * 100,
    })
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 9 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          formatter={(value, _name, props) => {
            const payload = props.payload as { weight: number; available: boolean };
            if (!payload.available) return ["Unavailable", "Score"];
            return [`${value} (category weight: ${payload.weight}%)`, "Score"];
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                !entry.available
                  ? "#3f3f46"
                  : entry.score >= 80
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
