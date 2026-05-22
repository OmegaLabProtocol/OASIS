import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Code2,
  Droplets,
  Layers,
  Shield,
  Wallet,
  Landmark,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  APP_NAME,
  APP_FULL_NAME,
  TAGLINE,
  ORI_FULL_NAME,
  ORI_BENCHMARK_COPY,
  ORI_PROPRIETARY_COPY,
  DISCLAIMER,
} from "@/lib/constants";

const features = [
  { icon: BarChart3, title: "Omega Risk Index", desc: "Proprietary institutional risk benchmark scoring digital assets 0–100." },
  { icon: Droplets, title: "Liquidity Intelligence", desc: "Slippage modeling, depth analysis, and market structure risk metrics." },
  { icon: Wallet, title: "Wallet Monitoring", desc: "Smart money, whale, treasury, and exchange wallet behavioral analytics." },
  { icon: Layers, title: "Protocol Health", desc: "TVL, revenue sustainability, governance, and treasury runway analysis." },
  { icon: Landmark, title: "Treasury Risk", desc: "Institutional treasury exposure and cross-protocol dependency tracking." },
  { icon: Bell, title: "Institutional Alerts", desc: "Escalation-ready risk alerts with suggested institutional review actions." },
  { icon: Brain, title: "AI Risk Summaries", desc: "AI-generated market intelligence for daily risk team workflows." },
  { icon: Code2, title: "API Intelligence Layer", desc: "Programmatic access for risk systems, due diligence, and compliance." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-border text-xs font-bold">
              Ω
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
              <p className="text-[9px] text-muted-foreground">{APP_FULL_NAME}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/methodology" className="hidden sm:block text-xs text-muted-foreground hover:text-foreground">
              Methodology
            </Link>
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/dashboard">Launch Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-24 pb-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {ORI_FULL_NAME} · {ORI_PROPRIETARY_COPY}
        </p>
        <h1 className="text-4xl md:text-5xl font-light tracking-tight max-w-3xl mx-auto leading-tight">
          {TAGLINE}
        </h1>
        <p className="mt-6 text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
          OASIS transforms fragmented blockchain, liquidity, wallet, protocol, and market data
          into institutional-grade intelligence powered by the Omega Risk Index.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              Launch Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/methodology">View Methodology</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/50">
              <CardHeader>
                <f.icon className="h-5 w-5 text-muted-foreground mb-2" />
                <CardTitle className="text-sm">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 border-t border-border">
        <h2 className="text-2xl font-light tracking-tight mb-2">How ORI Works</h2>
        <p className="text-sm text-muted-foreground max-w-3xl mb-8">{ORI_BENCHMARK_COPY}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { w: "25%", label: "Liquidity Stability" },
            { w: "20%", label: "Market Integrity" },
            { w: "15%", label: "Smart Money Positioning" },
            { w: "15%", label: "Volatility Risk" },
            { w: "10%", label: "Holder Concentration" },
            { w: "10%", label: "Social Sentiment Divergence" },
            { w: "5%", label: "Protocol Exposure Risk" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs w-10">{c.w}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Institutional Intelligence Engine
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            OASIS aggregates token, liquidity, wallet, protocol, treasury, governance, and market
            structure data into a unified risk workflow platform — designed for daily use by
            digital asset risk teams, not retail speculation.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Liquidity & Market Structure
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Move beyond TVL. OASIS models slippage at institutional trade sizes, LP concentration,
            volume/liquidity ratios, and market integrity signals to answer: can size move through
            this market without unacceptable risk?
          </p>
        </div>
        <div>
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet & Behavioral Analytics
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Monitor whale wallets, smart money clusters, treasury movements, VC distribution
            patterns, and exchange inflows with institutional-grade behavioral analytics.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-light mb-4 flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Future API Infrastructure
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Integrate ORI scores, alerts, and risk intelligence into internal risk systems,
            custody screening, fund due diligence, and compliance surveillance via REST API.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center border-t border-border">
        <h2 className="text-2xl font-light mb-4">Enterprise Intelligence Platform</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-8">
          OASIS is built for recurring SaaS revenue, API licensing, and institutional workflow
          dependency — the operating system for digital asset risk teams.
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard">Request Demo Access</Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {DISCLAIMER} OASIS is non-custodial software and does not hold user assets.
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            © {new Date().getFullYear()} {APP_NAME} · {APP_FULL_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}
