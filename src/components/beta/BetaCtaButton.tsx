"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useBeta } from "./BetaProvider";

interface BetaCtaButtonProps extends Omit<ButtonProps, "onClick"> {
  target?: string;
  mode?: "code" | "request";
}

/**
 * Public CTA that opens the beta gate instead of navigating. Remembers the
 * intended internal destination for post-authorization redirect.
 */
export function BetaCtaButton({
  target = "/dashboard",
  mode = "code",
  children,
  ...props
}: BetaCtaButtonProps) {
  const { open, openRequest } = useBeta();
  return (
    <Button
      {...props}
      onClick={() => (mode === "request" ? openRequest(target) : open(target))}
    >
      {children}
    </Button>
  );
}
