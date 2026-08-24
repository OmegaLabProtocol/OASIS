import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicHeader } from "@/components/beta/PublicHeader";

export const dynamic = "force-dynamic";

export default function InvitationUnavailablePage() {
  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <PublicHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <Card className="w-full">
          <CardContent className="pt-6">
            <h1 className="text-xl font-light tracking-tight">Invitation Unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This OASIS Private Beta invitation is no longer valid.
            </p>
            <Button asChild className="mt-6">
              <Link href="/?beta=request">Request Beta Access</Link>
            </Button>
          </CardContent>
        </Card>
        <p className="mt-6 text-[11px] text-muted-foreground/80">
          OASIS · Clarity in digital markets. · by Omega Labs Protocol
        </p>
      </main>
    </div>
  );
}
