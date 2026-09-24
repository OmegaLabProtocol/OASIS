import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DISCLAIMER } from "@/lib/constants";
import {
  ORI_CATEGORY_DIMENSION,
  ORI_CATEGORY_KEYS,
  ORI_CATEGORY_LABELS,
  ORI_CATEGORY_WEIGHTS,
  ORI_METHODOLOGY_VERSION,
} from "@/lib/ori/methodology";

export function MethodologyDetail() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-light tracking-tight">
          Category reference
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live scoring uses Methodology v{ORI_METHODOLOGY_VERSION}. Category weights
          below are within their dimension, not of final ORI.
        </p>
      </div>

      <div className="space-y-3">
        {ORI_CATEGORY_KEYS.map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm">
                {ORI_CATEGORY_LABELS[key]}{" "}
                <span className="text-muted-foreground font-normal">
                  ({ORI_CATEGORY_DIMENSION[key]}, {(ORI_CATEGORY_WEIGHTS[key] * 100).toFixed(0)}%)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {CATEGORY_COPY[key]}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-destructive/20">
        <CardContent className="pt-5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-2">Disclaimer</p>
          <p>{DISCLAIMER}</p>
        </CardContent>
      </Card>
    </div>
  );
}

const CATEGORY_COPY: Record<(typeof ORI_CATEGORY_KEYS)[number], string> = {
  tokenomics:
    "Supply structure, dilution, unlock overhang, and FDV versus circulating value when those observations exist.",
  ownership:
    "Holder concentration and ownership distribution. The concept applies to L1s; ERC-20 explorer metrics are unavailable, not not-applicable.",
  governance:
    "Governance and control surface. L1 control/security concentration still applies; Snapshot/Tally observations may be unavailable.",
  resilience:
    "Protocol or network resilience. L1 network security still applies; DeFiLlama TVL is not a substitute L1 observation.",
  institutional:
    "Market-structure and disclosed institutional context (market cap cohort, disclosed investors).",
  market:
    "Observable market stress: volume and short-horizon price dislocation.",
  liquidity:
    "Tradability and depth proxies from public market turnover and capitalization.",
  onChain:
    "On-chain conditions. L1 activity still applies; ERC-20 holder counts are unavailable for natives, not not-applicable.",
  protocol:
    "Protocol or network risk. L1 resilience still applies; missing L1-specific observations are unavailable, not not-applicable.",
};
