/**
 * Session-only portfolios for Investor Preview.
 * Never writes user_id / invite_id. Cleared when the tab session ends.
 */

export interface LocalPortfolioHolding {
  assetKey: string;
  symbol: string;
  weight: number;
}

export interface LocalPortfolio {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  holdings: LocalPortfolioHolding[];
}

const STORAGE_KEY = "oasis-investor-portfolios";

export function readLocalPortfolios(): LocalPortfolio[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalPortfolio[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalPortfolios(rows: LocalPortfolio[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // quota / private mode
  }
}

function newId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  return `invp_${uuid.replace(/-/g, "")}`;
}

export function applyLocalPortfolioAction(
  current: LocalPortfolio[],
  body: {
    action?: string;
    id?: string;
    name?: string;
    holdings?: LocalPortfolioHolding[];
    assetKey?: string;
    symbol?: string;
    weight?: number;
  }
): LocalPortfolio[] {
  const now = new Date().toISOString();
  switch (body.action) {
    case "create": {
      const name = body.name?.trim().slice(0, 80);
      if (!name) return current;
      return [
        { id: newId(), name, createdAt: now, updatedAt: now, holdings: [] },
        ...current,
      ];
    }
    case "delete":
      return current.filter((p) => p.id !== body.id);
    case "duplicate": {
      const source = current.find((p) => p.id === body.id);
      if (!source) return current;
      return [
        {
          ...source,
          id: newId(),
          name: `${source.name} copy`.slice(0, 80),
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ];
    }
    case "set-holdings":
      return current.map((p) =>
        p.id === body.id
          ? { ...p, holdings: body.holdings ?? [], updatedAt: now }
          : p
      );
    case "add-holding": {
      const key = (body.assetKey ?? "").toUpperCase();
      const symbol = (body.symbol ?? key).toUpperCase();
      if (!key) return current;
      return current.map((p) => {
        if (p.id !== body.id) return p;
        if (p.holdings.some((h) => h.assetKey === key)) return p;
        return {
          ...p,
          updatedAt: now,
          holdings: [
            ...p.holdings,
            { assetKey: key, symbol, weight: body.weight ?? 0 },
          ],
        };
      });
    }
    default:
      return current;
  }
}
