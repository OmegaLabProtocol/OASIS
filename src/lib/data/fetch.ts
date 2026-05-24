const DEFAULT_TIMEOUT_MS = 12_000;

const memoryCache = new Map<string, { expires: number; data: unknown }>();

export async function providerFetch<T>(
  url: string,
  options?: {
    headers?: Record<string, string>;
    cacheSeconds?: number;
    method?: "GET" | "POST";
    body?: string;
  }
): Promise<T | null> {
  const cacheSeconds = options?.cacheSeconds ?? 0;
  const cacheKey =
    cacheSeconds > 0 ? `${options?.method ?? "GET"}:${url}:${options?.body ?? ""}` : null;

  if (cacheKey) {
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
  }

  try {
    const res = await fetch(url, {
      method: options?.method ?? "GET",
      headers: options?.headers,
      body: options?.body,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      next: cacheSeconds > 0 ? { revalidate: cacheSeconds } : { revalidate: 0 },
    });

    if (res.status === 429) {
      console.warn(`[providerFetch] Rate limited: ${url}`);
      return null;
    }

    if (!res.ok) return null;

    const data = (await res.json()) as T;

    if (cacheKey) {
      memoryCache.set(cacheKey, {
        data,
        expires: Date.now() + cacheSeconds * 1000,
      });
    }

    return data;
  } catch {
    return null;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function providerMeta(
  source: string,
  endpointType: string,
  available: boolean,
  error?: string
) {
  return {
    source,
    endpointType,
    lastUpdated: nowIso(),
    available,
    error,
  };
}
