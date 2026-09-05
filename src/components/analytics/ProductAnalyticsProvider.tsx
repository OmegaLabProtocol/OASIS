"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ENGAGED_IDLE_THRESHOLD_MS } from "@/lib/analytics/activation";
import type { ClientProductEvent, ProductEventName } from "@/lib/analytics/types";

const SESSION_KEY = "oasis-analytics-session";
const STARTED_KEY = "oasis-analytics-session-started";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = newSessionId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return newSessionId();
  }
}

function assetIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/tokens\/([^/]+)/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

async function postBatch(
  sessionId: string,
  events: ClientProductEvent[],
  engagedSecondsDelta: number
) {
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, events, engagedSecondsDelta }),
      keepalive: true,
    });
  } catch {
    // Non-blocking.
  }
}

export function ProductAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sessionIdRef = React.useRef<string>("");
  const lastPathRef = React.useRef<string | null>(null);
  const queueRef = React.useRef<ClientProductEvent[]>([]);
  const engagedMsRef = React.useRef(0);
  const lastTickRef = React.useRef(0);
  const lastInteractionRef = React.useRef(0);
  const visibleRef = React.useRef(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  const flush = React.useCallback(() => {
    const events = queueRef.current;
    queueRef.current = [];
    const engagedSeconds = Math.floor(engagedMsRef.current / 1000);
    engagedMsRef.current = engagedMsRef.current % 1000;
    if (!sessionIdRef.current) return;
    if (events.length === 0 && engagedSeconds === 0) return;
    void postBatch(sessionIdRef.current, events, engagedSeconds);
  }, []);

  const track = React.useCallback((event: ClientProductEvent) => {
    queueRef.current.push(event);
  }, []);

  React.useEffect(() => {
    const started = Date.now();
    lastTickRef.current = started;
    lastInteractionRef.current = started;
    sessionIdRef.current = readSessionId();
    try {
      if (!sessionStorage.getItem(STARTED_KEY)) {
        sessionStorage.setItem(STARTED_KEY, "1");
        track({ name: "session_started", page: pathname });
      }
    } catch {
      track({ name: "session_started", page: pathname });
    }

    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
      if (visibleRef.current) {
        lastTickRef.current = Date.now();
        lastInteractionRef.current = Date.now();
      }
    };

    window.addEventListener("click", markInteraction);
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("focus", markInteraction);
    document.addEventListener("visibilitychange", onVisibility);

    const ticker = window.setInterval(() => {
      const now = Date.now();
      const idle = now - lastInteractionRef.current > ENGAGED_IDLE_THRESHOLD_MS;
      if (visibleRef.current && !idle) {
        engagedMsRef.current += now - lastTickRef.current;
      }
      lastTickRef.current = now;
    }, 1000);

    const flusher = window.setInterval(flush, 15000);
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);

    return () => {
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("focus", markInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.clearInterval(ticker);
      window.clearInterval(flusher);
      flush();
    };
  }, [flush, pathname, track]);

  React.useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    lastInteractionRef.current = Date.now();

    const event: ClientProductEvent = {
      name: "page_viewed",
      page: pathname,
      assetId: assetIdFromPath(pathname),
    };
    track(event);

    if (pathname.startsWith("/tokens/")) {
      track({
        name: "asset_viewed",
        page: pathname,
        assetId: assetIdFromPath(pathname),
      });
    }
  }, [pathname, track]);

  return <>{children}</>;
}

/** Fire-and-forget helper for feature surfaces (screener, watchlist, ORION). */
export function trackProductEvent(
  name: ProductEventName,
  extras: Omit<ClientProductEvent, "name"> = {}
) {
  if (typeof window === "undefined") return;
  try {
    const sessionId = readSessionId();
    void postBatch(sessionId, [{ name, ...extras, page: extras.page ?? window.location.pathname }], 0);
  } catch {
    // ignore
  }
}
