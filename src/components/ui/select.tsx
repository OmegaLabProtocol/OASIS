import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Themed native <select>. Native selects are keyboard-accessible and
 * mobile-friendly by default; the styling problem they previously had was that
 * a transparent trigger background let the OS render the option popup with a
 * white system background while text used the (near-white in dark mode) theme
 * foreground — producing unreadable white-on-white / dark-on-dark lists.
 *
 * The fix, applied here once for every beta/admin dropdown:
 *  - a SOLID `bg-background` trigger (so the popup inherits a themed background)
 *  - explicit `text-foreground`
 *  - explicit option background/text via the `[&>option]` child selector
 * All colors come from OASIS design tokens, so both light and dark modes are
 * readable with correct borders, hover, focus, and disabled states.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-border bg-background px-3 py-1 pr-8 text-sm text-foreground shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>option]:bg-background [&>option]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  </div>
));
Select.displayName = "Select";

export { Select };
