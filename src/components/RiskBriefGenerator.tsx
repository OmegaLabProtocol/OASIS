"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import { FileText } from "lucide-react";
import type { RiskLabel } from "@/lib/types";
import { DISCLAIMER } from "@/lib/constants";

interface RiskBriefProps {
  asset: string;
  oriScore: number;
  riskLabel: RiskLabel;
  strengths: string[];
  risks: string[];
  liquiditySummary: string;
  walletSummary: string;
  protocolSummary: string;
  commentary: string;
}

export function RiskBriefGenerator(props: RiskBriefProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <Button onClick={() => setShow(!show)} variant="outline" className="gap-2">
        <FileText className="h-4 w-4" />
        {show ? "Hide Risk Brief" : "Generate Risk Brief"}
      </Button>

      {show && (
        <Card className="mt-4 border-foreground/10">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Investment Committee Risk Brief
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {props.asset} · Omega Risk Index Report · Confidential
                </p>
              </div>
              <ScoreGauge score={props.oriScore} size="sm" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-3">
              <RiskBadge label={props.riskLabel} />
              <span className="text-xs text-muted-foreground">
                Proprietary institutional risk benchmark
              </span>
            </div>

            <section>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Top Strengths
              </h4>
              <ul className="space-y-1">
                {props.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-success">+</span> {s}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Top Risks
              </h4>
              <ul className="space-y-1">
                {props.risks.map((r, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-destructive">−</span> {r}
                  </li>
                ))}
              </ul>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Liquidity Summary
                </h4>
                <p className="text-sm">{props.liquiditySummary}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Wallet Activity
                </h4>
                <p className="text-sm">{props.walletSummary}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Protocol Exposure
                </h4>
                <p className="text-sm">{props.protocolSummary}</p>
              </div>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Institutional Commentary
              </h4>
              <p className="text-sm leading-relaxed">{props.commentary}</p>
            </section>

            <p className="text-[10px] text-muted-foreground border-t border-border pt-4">
              {DISCLAIMER}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
