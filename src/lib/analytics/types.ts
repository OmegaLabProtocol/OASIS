/**
 * First-party product analytics taxonomy (spec §36–§42).
 * Keep this list small — only meaningful workflow events, not interaction noise.
 */

export const PRODUCT_EVENT_NAMES = [
  "session_started",
  "page_viewed",
  "asset_viewed",
  "ori_breakdown_viewed",
  "ori_history_viewed",
  "ori_history_range_changed",
  "screener_run",
  "screener_filter_applied",
  "saved_screen_created",
  "saved_screen_loaded",
  "portfolio_created",
  "portfolio_asset_added",
  "portfolio_asset_removed",
  "portfolio_weights_changed",
  "portfolio_analysis_viewed",
  "watchlist_asset_added",
  "watchlist_asset_removed",
  "alert_created",
  "orion_question_submitted",
  "csv_exported",
  "report_generated",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const VALUE_EVENT_NAMES = [
  "ori_breakdown_viewed",
  "screener_run",
  "saved_screen_created",
  "portfolio_analysis_viewed",
  "portfolio_created",
  "watchlist_asset_added",
  "alert_created",
  "orion_question_submitted",
  "csv_exported",
  "report_generated",
] as const;

export type ValueEventName = (typeof VALUE_EVENT_NAMES)[number];

export function isProductEventName(value: unknown): value is ProductEventName {
  return (
    typeof value === "string" &&
    (PRODUCT_EVENT_NAMES as readonly string[]).includes(value)
  );
}

export function isValueEvent(name: ProductEventName): boolean {
  return (VALUE_EVENT_NAMES as readonly string[]).includes(name);
}

export interface ClientProductEvent {
  name: ProductEventName;
  page?: string | null;
  assetId?: string | null;
  portfolioId?: string | null;
  savedScreenId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AnalyticsIngestPayload {
  sessionId: string;
  engagedSecondsDelta?: number;
  events: ClientProductEvent[];
}
