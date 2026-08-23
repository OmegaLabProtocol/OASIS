"use client";

import { useState } from "react";
import { ArrowRight, Bot, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetProfile } from "@/lib/assetProfile/types";
import { buildOasisRiskContext } from "@/services/assetProfile/riskContext";
import { useCopilot } from "@/components/copilot/CopilotProvider";

/** Format an ISO date as "July 2015" (month + year). */
function formatLaunchMonth(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatLaunchFull(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

interface ResourceLink {
  label: string;
  href: string;
}

function collectResources(profile: AssetProfile): ResourceLink[] {
  const out: ResourceLink[] = [];
  if (profile.officialWebsite) out.push({ label: "Website", href: profile.officialWebsite });
  if (profile.documentationUrl) out.push({ label: "Docs", href: profile.documentationUrl });
  if (profile.whitepaperUrl) out.push({ label: "Whitepaper", href: profile.whitepaperUrl });
  if (profile.sourceCodeUrl) out.push({ label: "GitHub", href: profile.sourceCodeUrl });
  if (profile.explorers[0]) out.push({ label: "Explorer", href: profile.explorers[0] });
  return out;
}

function ResourceLinks({ links }: { links: ResourceLink[] }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-foreground/80",
            "hover:bg-muted hover:text-foreground transition-colors"
          )}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-foreground/90" title={value}>
        {value}
      </p>
    </div>
  );
}

export function AssetProfileCard({ profile }: { profile: AssetProfile }) {
  const [expanded, setExpanded] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const { open } = useCopilot();

  const resources = collectResources(profile);
  const launchMonth = formatLaunchMonth(profile.launchDate);
  const classificationLine = profile.assetTypes.join(" · ");
  const utilityLine = profile.utilities.join(" · ");
  const riskContext = buildOasisRiskContext(profile.assetTypes, profile.symbol);
  const hasDescription = !!profile.shortDescription;
  const truncated = !!profile.shortDescription && !!profile.description && profile.description.length > profile.shortDescription.length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Asset Profile
        </CardTitle>
        <span className="text-[10px] text-muted-foreground">
          Profile data: {profile.profileDataSource}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Identity */}
        <div className="flex items-start gap-3">
          {profile.logo && logoOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo}
              alt={`${profile.name} logo`}
              width={36}
              height={36}
              className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-border/60 bg-muted object-contain"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-xs font-medium text-muted-foreground">
              {profile.symbol.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate text-base font-medium tracking-tight">{profile.name}</h3>
              <span className="font-mono text-xs text-muted-foreground">{profile.symbol}</span>
            </div>
            {classificationLine && (
              <p className="mt-0.5 text-xs text-muted-foreground">{classificationLine}</p>
            )}
          </div>
        </div>

        {/* Snapshot grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Launched" value={launchMonth ?? "Not available"} />
          <Field label="Network" value={profile.network ?? "Not available"} />
          <Field label="Type" value={profile.assetTypes[0] ?? "Not available"} />
          <Field label="Primary Utility" value={utilityLine || "Not available"} />
        </div>

        {/* About */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            About {profile.symbol}
          </p>
          {hasDescription ? (
            <p className="text-xs leading-relaxed text-foreground/85">
              {profile.shortDescription}
              {truncated && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="ml-1 whitespace-nowrap text-[11px] text-primary hover:underline"
                >
                  Read more →
                </button>
              )}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Detailed project information is not currently available from the connected data sources.
            </p>
          )}
        </div>

        {resources.length > 0 && <ResourceLinks links={resources} />}

        {/* Expandable full profile */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-4 border-t border-border/60 pt-4">
              {profile.description && (
                <Section title="Full Description">
                  <p className="text-xs leading-relaxed text-foreground/85">{profile.description}</p>
                </Section>
              )}

              {(profile.assetTypes.length > 0 || profile.categories.length > 0 || profile.tags.length > 0) && (
                <Section title="Categories & Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.assetTypes.map((t) => (
                      <Badge key={`c-${t}`} variant="default">
                        {t}
                      </Badge>
                    ))}
                    {profile.categories
                      .filter((c) => !profile.assetTypes.some((t) => t.toLowerCase() === c.toLowerCase()))
                      .map((c) => (
                        <Badge key={`cat-${c}`} variant="outline">
                          {c}
                        </Badge>
                      ))}
                  </div>
                  {profile.tags.length > 0 && (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {profile.tags.join(" · ")}
                    </p>
                  )}
                </Section>
              )}

              {profile.network && (
                <Section title="Ecosystem / Network">
                  <p className="text-xs text-foreground/85">
                    {profile.name} operates on <span className="font-medium">{profile.network}</span>.
                  </p>
                </Section>
              )}

              {profile.utilities.length > 0 && (
                <Section title="Utility">
                  <p className="text-xs leading-relaxed text-foreground/85">
                    {profile.symbol} is primarily associated with{" "}
                    {profile.utilities.slice(0, 3).map((u) => u.toLowerCase()).join(", ")}
                    {profile.utilities.length > 1 ? " within its ecosystem." : "."}
                  </p>
                </Section>
              )}

              <Section title="Launch Information">
                <p className="text-xs text-foreground/85">
                  Launch Date: <span className="font-medium">{formatLaunchFull(profile.launchDate) ?? "Not available"}</span>
                </p>
              </Section>

              {resources.length > 0 && (
                <Section title="Official Resources">
                  <ResourceLinks links={resources} />
                </Section>
              )}

              <Section title="OASIS Risk Context">
                <p className="text-xs leading-relaxed text-foreground/85">{riskContext}</p>
              </Section>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? "Hide full profile" : "View full profile"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>

          <button
            type="button"
            onClick={open}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium text-foreground/90 hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bot className="h-3.5 w-3.5 text-primary" />
            Ask ORION about {profile.symbol}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
