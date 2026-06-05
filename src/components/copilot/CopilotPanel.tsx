"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, SendHorizonal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CopilotMessage as WireMessage,
  CopilotResponseMeta,
  CopilotTokenCandidate,
} from "@/lib/copilot/types";
import { useCopilot } from "./CopilotProvider";
import { CopilotMessage, type ChatMessage } from "./CopilotMessage";
import { SuggestedPrompts } from "./SuggestedPrompts";

let idCounter = 0;
const nextId = () => `m${Date.now()}_${idCounter++}`;

interface Disambiguation {
  query: string;
  candidates: CopilotTokenCandidate[];
}

export function CopilotPanel() {
  const { isOpen, open, close, contextToken } = useCopilot();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disambiguation, setDisambiguation] = useState<Disambiguation | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const patchMessage = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  async function run(question: string, forceTokenId?: string) {
    const isResend = !!forceTokenId;
    setError(null);
    setDisambiguation(null);
    setLoading(true);
    lastQuestionRef.current = question;

    const history: WireMessage[] = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));

    const outgoing: WireMessage[] = isResend
      ? history
      : [...history, { role: "user", content: question }];

    const assistantId = nextId();
    setMessages((prev) => {
      const userBubble: ChatMessage[] = isResend
        ? []
        : [{ id: nextId(), role: "user", content: question }];
      return [
        ...prev,
        ...userBubble,
        { id: assistantId, role: "assistant", content: "", pending: true },
      ];
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoing,
          contextToken: contextToken ?? null,
          forceTokenId: forceTokenId ?? null,
        }),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data?.kind === "disambiguation") {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setDisambiguation({ query: data.query, candidates: data.candidates });
          return;
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError(data?.error ?? "The Copilot returned an unexpected response.");
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError("The Copilot is temporarily unavailable. Please retry.");
        return;
      }

      let meta: CopilotResponseMeta | null = null;
      const rawMeta = res.headers.get("X-Copilot-Meta");
      if (rawMeta) {
        try {
          meta = JSON.parse(decodeURIComponent(rawMeta)) as CopilotResponseMeta;
        } catch {
          meta = null;
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      patchMessage(assistantId, { pending: false });

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patchMessage(assistantId, { content: acc });
      }
      patchMessage(assistantId, { content: acc, meta, pending: false });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      setError("Network error reaching the Copilot. Please retry.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void run(text);
  };

  const retry = () => {
    if (loading || !lastQuestionRef.current) return;
    void run(lastQuestionRef.current);
  };

  const clear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setDisambiguation(null);
    lastQuestionRef.current = null;
  };

  return (
    <>
      {/* Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={open}
          aria-label="Ask ORION"
          className={cn(
            "fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full",
            "border border-border bg-card px-4 py-2.5 text-xs font-medium shadow-lg",
            "hover:bg-muted transition-colors"
          )}
        >
          <Bot className="h-4 w-4 text-primary" />
          Ask ORION
        </button>
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[420px]",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium leading-none">ORION Analysis</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Risk Intelligence for Digital Assets
                {contextToken ? ` · ${contextToken.symbol}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear conversation" title="Clear conversation">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={close} aria-label="Close ORION Analysis">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                Deterministic ORI analysis — breakdowns, metric rationale, price
                context, comparisons, risk memos, and institutional screens. No API
                key required.
                {contextToken
                  ? ` Currently focused on ${contextToken.symbol}.`
                  : " Open a token page for context-aware answers."}
              </div>
              <SuggestedPrompts onPick={(p) => run(p)} disabled={loading} />
            </div>
          )}

          {messages.map((m) => (
            <CopilotMessage key={m.id} message={m} />
          ))}

          {disambiguation && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs">
                I found multiple matches for{" "}
                <span className="font-medium">{disambiguation.query}</span>. Which
                one do you mean?
              </p>
              <div className="flex flex-wrap gap-2">
                {disambiguation.candidates.map((c) => (
                  <button
                    key={c.detailKey}
                    type="button"
                    onClick={() => run(disambiguation.query, c.detailKey)}
                    className="rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    {c.symbol} — {c.name}
                    {c.marketCapRank ? ` · #${c.marketCapRank}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <p className="text-destructive">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Ask ORION…"
              className={cn(
                "flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-xs",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "max-h-28"
              )}
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Risk analysis only · not investment advice
          </p>
        </div>
      </aside>
    </>
  );
}
