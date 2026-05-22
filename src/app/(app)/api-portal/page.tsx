import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Code2, Check } from "lucide-react";

const useCases = [
  "Risk systems integration",
  "Fund due diligence",
  "Custody screening",
  "Treasury monitoring",
  "Exchange listing review",
  "Compliance surveillance",
  "DAO risk monitoring",
];

const endpoints = [
  { path: "/api/ori-score", desc: "ORI scores and component breakdown" },
  { path: "/api/liquidity", desc: "Liquidity depth and slippage metrics" },
  { path: "/api/wallet-intelligence", desc: "Wallet behavioral analytics (mock)" },
  { path: "/api/protocol-health", desc: "Protocol TVL, revenue, and health scores" },
  { path: "/api/alerts", desc: "Institutional alert feed" },
  { path: "/api/market", desc: "Market-wide risk overview" },
];

const exampleResponse = `{
  "asset": "ETH",
  "oriScore": 84,
  "riskLabel": "Institutional Grade",
  "liquidityStability": 91,
  "marketIntegrity": 86,
  "smartMoneyPositioning": 78,
  "volatilityRisk": 74,
  "holderConcentration": 88,
  "socialSentimentDivergence": 69,
  "protocolExposureRisk": 82
}`;

const pricing = [
  {
    tier: "Starter",
    price: "$500/mo",
    features: [
      "Dashboard access",
      "Limited watchlist",
      "Basic ORI scores",
    ],
  },
  {
    tier: "Pro",
    price: "$2,500/mo",
    featured: true,
    features: [
      "Full dashboard",
      "Alerts",
      "Token reports",
      "API access",
      "Advanced risk history",
    ],
  },
  {
    tier: "Enterprise",
    price: "Custom",
    features: [
      "Custom integrations",
      "White-labeled API",
      "Dedicated datasets",
      "Risk committee reporting",
      "SLA/support",
    ],
  },
];

export default function ApiPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">API Intelligence Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How can an institution integrate this intelligence into internal systems?
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground max-w-2xl">
            OASIS API enables institutions to embed ORI risk intelligence into internal
            risk systems, custody workflows, compliance surveillance, and fund operations —
            creating recurring API licensing revenue alongside SaaS subscriptions.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Institutional Use Cases
        </h2>
        <div className="flex flex-wrap gap-2">
          {useCases.map((uc) => (
            <Badge key={uc} variant="outline">
              {uc}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pricing.map((p) => (
          <Card
            key={p.tier}
            className={p.featured ? "border-foreground/30" : ""}
          >
            <CardHeader>
              <CardTitle className="text-base">{p.tier}</CardTitle>
              <p className="text-2xl font-light font-mono">{p.price}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <Check className="h-3 w-3 text-success shrink-0" />
                  {f}
                </div>
              ))}
              <Button
                variant={p.featured ? "default" : "outline"}
                size="sm"
                className="w-full mt-4"
              >
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          API Endpoints
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {endpoints.map((ep) => (
            <Card key={ep.path}>
              <CardContent className="pt-4 flex items-start gap-3">
                <Code2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <code className="text-xs font-mono">{ep.path}</code>
                  <p className="text-xs text-muted-foreground mt-1">{ep.desc}</p>
                  <Link
                    href={ep.path}
                    className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-block"
                  >
                    Try endpoint →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Example Response — GET /api/ori-score?symbol=ETH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted/40 rounded-md p-4 overflow-x-auto">
            {exampleResponse}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
