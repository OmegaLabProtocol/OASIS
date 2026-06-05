"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopilotResponseMeta } from "@/lib/copilot/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: CopilotResponseMeta | null;
  pending?: boolean;
}

/** Minimal, dependency-free inline Markdown (bold / italic / inline code). */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^\*[^*]+\*$/.test(part)) {
      return (
        <em key={i} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

/** Block-level Markdown: headers, lists, quotes, tables, paragraphs. */
function renderMarkdown(content: string): ReactNode {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let tableRows: string[][] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="my-1.5 ml-3 list-disc space-y-1">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  const flushTable = (key: string) => {
    if (tableRows.length < 2) {
      tableRows = [];
      return;
    }
    const [head, ...body] = tableRows;
    blocks.push(
      <div key={key} className="my-2 overflow-x-auto rounded-md border border-border/60">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              {head.map((cell, i) => (
                <th key={i} className="px-2 py-1.5 text-left font-medium">
                  {renderInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-border/40 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1.5 text-muted-foreground">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  lines.forEach((line, idx) => {
    const key = `b${idx}`;

    if (line.trim().startsWith("|")) {
      flushList(`l${idx}`);
      if (isTableSeparator(line)) return;
      tableRows.push(parseTableRow(line));
      return;
    } else {
      flushTable(`t${idx}`);
    }

    if (line.startsWith("### ")) {
      flushList(`l${idx}`);
      blocks.push(
        <h5 key={key} className="mt-2.5 mb-1 text-xs font-semibold">
          {renderInline(line.slice(4))}
        </h5>
      );
    } else if (line.startsWith("## ")) {
      flushList(`l${idx}`);
      blocks.push(
        <h4
          key={key}
          className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {renderInline(line.slice(3))}
        </h4>
      );
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.startsWith("> ")) {
      flushList(`l${idx}`);
      blocks.push(
        <p
          key={key}
          className="my-1.5 border-l-2 border-border pl-2 text-[11px] text-muted-foreground"
        >
          {renderInline(line.slice(2))}
        </p>
      );
    } else if (line.trim() === "") {
      flushList(`l${idx}`);
    } else {
      flushList(`l${idx}`);
      blocks.push(
        <p key={key} className="my-1.5 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushTable("t-final");
  flushList("l-final");

  return blocks;
}

function severityClass(s: string): string {
  if (s === "High") return "bg-destructive/15 text-destructive border-destructive/30";
  if (s === "Moderate") return "bg-warning/15 text-warning border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

function SourceLabels({ meta }: { meta: CopilotResponseMeta }) {
  const labels: string[] = [];
  if (meta.intent) labels.push(meta.intent.replace(/_/g, " "));
  if (meta.dataMode) labels.push(`Mode: ${meta.dataMode}`);
  if (meta.confidence) labels.push(`Confidence: ${meta.confidence}`);
  if (meta.sources.length) labels.push(`Sources: ${meta.sources.join(", ")}`);

  return (
    <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {meta.severity && (
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              severityClass(meta.severity)
            )}
          >
            Severity: {meta.severity}
          </span>
        )}
        <span className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          Deterministic
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">{labels.join(" · ")}</p>
      {meta.usedFallback && meta.mockCategories.length > 0 && (
        <p className="text-[10px] text-warning">
          Estimated / fallback data used for: {meta.mockCategories.join(", ")}.
          Treat as directional, not verified live data.
        </p>
      )}
    </div>
  );
}

export function CopilotMessage({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div className="w-full max-w-[92%] rounded-lg rounded-bl-sm border border-border/60 bg-muted/30 px-3 py-2 text-xs">
        {message.content ? (
          <div className="text-foreground/90">{renderMarkdown(message.content)}</div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        )}

        {!message.pending && message.meta && <SourceLabels meta={message.meta} />}

        {!message.pending && message.content && (
          <button
            type="button"
            onClick={copy}
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground",
              "opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
