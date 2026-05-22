"use client";

import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ScoreGauge({ score, size = "md", label = "ORI" }: ScoreGaugeProps) {
  const dimensions = { sm: 80, md: 120, lg: 160 };
  const dim = dimensions[size];
  const stroke = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "stroke-success"
      : score >= 60
        ? "stroke-foreground/60"
        : score >= 40
          ? "stroke-warning"
          : "stroke-destructive";

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", color)}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        <span
          className={cn(
            "font-mono font-light tracking-tight",
            size === "sm" ? "text-xl" : size === "md" ? "text-3xl" : "text-4xl"
          )}
        >
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
