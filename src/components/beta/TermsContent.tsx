import * as React from "react";

/** Minimal, safe renderer for the stored markdown-ish Terms content. */
export function TermsContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let key = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={key++} className="text-sm font-medium mt-4">
          {inline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={key++} className="text-sm font-semibold mt-5">
          {inline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h2 key={key++} className="text-base font-semibold mt-2">
          {inline(line.slice(2))}
        </h2>
      );
    } else {
      blocks.push(
        <p key={key++} className="text-xs text-muted-foreground leading-relaxed">
          {inline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-1.5">{blocks}</div>;
}

/** Renders **bold** and _italic_ inline markers; everything else is literal. */
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
