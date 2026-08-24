import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TermsContent } from "@/components/beta/TermsContent";
import { listTerms } from "@/lib/beta/terms";
import { formatDate } from "@/lib/beta/format";

export const dynamic = "force-dynamic";

export default async function AdminTermsPage() {
  const terms = await listTerms();

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Private Beta Terms</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Versioned Terms. Beta participants must accept the active version before entry.
          Interim language — requires attorney review before final reliance.
        </p>
      </div>

      {terms.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No Terms versions found. Apply the migration seed to create v1.0.
          </CardContent>
        </Card>
      ) : (
        terms.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {t.title} · v{t.version}
                {t.active && <Badge variant="success">Active</Badge>}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Effective {formatDate(t.effective_at)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-4">
                <TermsContent content={t.content} />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
