"use client";

import * as React from "react";
import { useBeta } from "./BetaProvider";
import { safeInternalPath } from "@/lib/beta/redirect";

/**
 * When the middleware redirects an unauthorized visitor to `/?beta=1&next=...`,
 * this opens the beta gate automatically and preserves the intended
 * destination. Cleans the query string afterward.
 */
export function BetaGateWatcher() {
  const { open, openRequest } = useBeta();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const beta = params.get("beta");
    if (beta === "1" || beta === "request") {
      const next = safeInternalPath(params.get("next"));
      if (beta === "request") openRequest(next);
      else open(next);
      params.delete("beta");
      params.delete("next");
      const qs = params.toString();
      const clean = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState({}, "", clean);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
