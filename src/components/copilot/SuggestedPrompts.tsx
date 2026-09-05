"use client";

import { cn } from "@/lib/utils";

const PROMPTS = [
  "Explain this ORI score",
  "What is this token used for?",
  "Which risks matter most?",
  "Why did ORI change?",
  "Analyze price vs ORI",
  "Compare with another token",
  "Generate risk memo",
  "Find stronger institutional alternatives",
  "What is driving risk in my portfolio?",
] as const;

interface SuggestedPromptsProps {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ onPick, disabled }: SuggestedPromptsProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Suggested
      </p>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className={cn(
              "rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground/90",
              "hover:bg-muted hover:border-border transition-colors text-left",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
