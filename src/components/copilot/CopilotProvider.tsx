"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { CopilotContextToken } from "@/lib/copilot/types";

interface CopilotContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Token derived from the current route (token detail pages), if any. */
  contextToken: CopilotContextToken | null;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

/** Derive token context from the URL so token pages need no modification. */
function deriveContextToken(pathname: string | null): CopilotContextToken | null {
  if (!pathname) return null;
  const match = pathname.match(/\/tokens\/([^/?#]+)/);
  if (!match) return null;
  const seg = decodeURIComponent(match[1]);
  if (!seg) return null;
  return {
    symbol: seg.toUpperCase(),
    name: seg,
    detailKey: seg,
    registryStatus: "curated",
  };
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const value = useMemo<CopilotContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      contextToken: deriveContextToken(pathname),
    }),
    [isOpen, pathname]
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot(): CopilotContextValue {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot must be used within CopilotProvider");
  return ctx;
}
