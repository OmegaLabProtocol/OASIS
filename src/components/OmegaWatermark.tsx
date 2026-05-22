import { cn } from "@/lib/utils";

export function OmegaWatermark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 omega-watermark opacity-100",
        className
      )}
      aria-hidden
    />
  );
}
