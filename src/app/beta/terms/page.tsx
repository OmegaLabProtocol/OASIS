import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/beta/PublicHeader";
import { TermsContent } from "@/components/beta/TermsContent";
import { BetaTermsAcceptance } from "@/components/beta/BetaTermsAcceptance";
import { getPendingSession } from "@/lib/beta/authorization";
import { getActiveTerms } from "@/lib/beta/terms";
import { getInviteById } from "@/lib/beta/validateInvite";
import { recordEvent } from "@/lib/beta/events";
import { betaUserActor } from "@/lib/beta/actor";
import { safeInternalPath } from "@/lib/beta/redirect";

export const dynamic = "force-dynamic";

export default async function BetaTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const pending = await getPendingSession();
  if (!pending) redirect("/?beta=1");

  const terms = await getActiveTerms();
  if (!terms) redirect("/?beta=1");

  const { next: nextParam } = await searchParams;
  const next = safeInternalPath(nextParam);

  const pendingInvite = await getInviteById(pending.i);
  await recordEvent("terms_viewed", {
    inviteId: pending.i,
    subjectInviteId: pending.i,
    actor: pendingInvite ? betaUserActor(pendingInvite) : null,
    metadata: { version: terms.version },
  });

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            OASIS Private Beta
          </p>
          <h1 className="mt-2 text-2xl font-light tracking-tight">
            Private Beta &amp; Confidentiality
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Before accessing OASIS, please review and accept the Private Beta Terms.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {terms.title}{" "}
              <span className="text-muted-foreground font-normal">
                · v{terms.version}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[46vh] overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-4">
              <TermsContent content={terms.content} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <BetaTermsAcceptance version={terms.version} next={next} />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
          OASIS · Clarity in digital markets. · by Omega Labs Protocol
        </p>
      </main>
    </div>
  );
}
