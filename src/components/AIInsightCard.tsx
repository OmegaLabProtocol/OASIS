import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function AIInsightCard({
  title = "AI Market Intelligence",
  summary,
}: {
  title?: string;
  summary: string;
}) {
  return (
    <Card className="border-border/60 bg-gradient-to-br from-muted/20 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
        <p className="mt-3 text-[10px] text-muted-foreground">
          AI-generated summary for informational purposes only. Not investment advice.
        </p>
      </CardContent>
    </Card>
  );
}
