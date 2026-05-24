"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseReportSections,
  printReportAsPdf,
} from "@/lib/intelligenceReport";
import type {
  DataConfidence,
  GenerateReportPayload,
  GenerateReportResponse,
  IntelligenceReportBrief,
  OriComponentScores,
  OriMetrics,
  TokenRawMetrics,
} from "@/lib/types";
import type { OriLookupResult } from "@/lib/data/types";
import { DISCLAIMER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  Check,
  Copy,
  Loader2,
  Printer,
  X,
} from "lucide-react";

type ReportState = "idle" | "loading" | "success" | "error";

interface ORIIntelligenceReportProps {
  metrics: OriMetrics;
  components: OriComponentScores;
  raw: TokenRawMetrics;
  confidence: DataConfidence;
  brief: IntelligenceReportBrief;
  commentary: string;
  dataSource?: string;
  oriResult?: OriLookupResult | null;
  children: ReactNode;
}

interface ReportContextValue {
  metrics: OriMetrics;
  state: ReportState;
  report: string | null;
  reportSource: "openai" | "demo" | null;
  copied: boolean;
  handleGenerate: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleDismiss: () => void;
  handlePrintPdf: () => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

function useReportContext() {
  const ctx = useContext(ReportContext);
  if (!ctx) {
    throw new Error(
      "ORI Intelligence Report components must be used within ORIIntelligenceReport"
    );
  }
  return ctx;
}

export function ORIIntelligenceReport({
  metrics,
  components,
  raw,
  confidence,
  brief,
  commentary,
  dataSource,
  oriResult,
  children,
}: ORIIntelligenceReportProps) {
  const [state, setState] = useState<ReportState>("idle");
  const [report, setReport] = useState<string | null>(null);
  const [reportSource, setReportSource] = useState<"openai" | "demo" | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setState("loading");
    setCopied(false);

    const payload: GenerateReportPayload = {
      metrics,
      components,
      raw,
      confidence,
      brief,
      commentary,
      dataSource,
      mockDataUsed: oriResult?.mockDataUsed,
      mockCategories: oriResult?.mockCategories,
      mockDataDisclaimer: oriResult?.mockDataDisclaimer,
    };

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setState("error");
        return;
      }

      const data = (await response.json()) as GenerateReportResponse;
      setReport(data.report);
      setReportSource(data.source);
      setState("success");
    } catch {
      setState("error");
    }
  }

  async function handleCopy() {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleDismiss() {
    setState("idle");
    setReport(null);
    setReportSource(null);
    setCopied(false);
  }

  function handlePrintPdf() {
    if (!report) return;

    printReportAsPdf({
      assetName: metrics.name,
      symbol: metrics.symbol,
      oriScore: metrics.oriScore,
      riskLabel: metrics.riskLabel,
      report,
      reportSource: reportSource ?? undefined,
    });
  }

  return (
    <ReportContext.Provider
      value={{
        metrics,
        state,
        report,
        reportSource,
        copied,
        handleGenerate,
        handleCopy,
        handleDismiss,
        handlePrintPdf,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function ORIIntelligenceReportButton() {
  const { state, handleGenerate } = useReportContext();

  return (
    <Button
      onClick={handleGenerate}
      disabled={state === "loading"}
      variant="outline"
      size="sm"
      className="mt-4 gap-2 w-full"
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <BrainCircuit className="h-3.5 w-3.5" />
      )}
      Generate AI Report
    </Button>
  );
}

export function ORIIntelligenceReportPanel() {
  const {
    metrics,
    state,
    report,
    reportSource,
    copied,
    handleCopy,
    handleDismiss,
    handlePrintPdf,
  } = useReportContext();

  if (state === "idle") return null;

  const sections = report ? parseReportSections(report) : [];

  return (
    <div className="space-y-4">
      {state === "loading" && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating institutional report…
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            Unable to generate report. Please try again.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Close report"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      )}

      {state === "success" && report && (
        <Card className="border-foreground/10 bg-gradient-to-br from-muted/10 via-card to-card">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                  ORI Intelligence Report
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {metrics.name} ({metrics.symbol}) · Confidential
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPdf}
                  className="gap-2"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="gap-2"
                >
                  <X className="h-3.5 w-3.5" />
                  Close Report
                </Button>
                {reportSource && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {reportSource === "openai" ? "AI Generated" : "Demo Report"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-5 rounded-lg border border-border/60 bg-background/50 p-5">
              {sections.map((section) => (
                <section key={section.title}>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    {section.title}
                  </h3>
                  <div
                    className={cn(
                      "text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap",
                      section.title === "Final Institutional Risk Rating" &&
                        "font-medium"
                    )}
                  >
                    {section.body}
                  </div>
                </section>
              ))}

              <p className="border-t border-border/60 pt-4 text-[10px] text-muted-foreground">
                {DISCLAIMER}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
