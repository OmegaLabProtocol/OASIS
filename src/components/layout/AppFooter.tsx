import { DISCLAIMER } from "@/lib/constants";

export function AppFooter() {
  return (
    <footer className="border-t border-border px-6 py-4 mt-auto">
      <p className="text-[10px] text-muted-foreground leading-relaxed max-w-4xl">
        {DISCLAIMER}
      </p>
    </footer>
  );
}
