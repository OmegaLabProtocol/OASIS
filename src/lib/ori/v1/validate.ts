/**
 * Deterministic Methodology v1.0 engine cases.
 * Run: node --experimental-strip-types src/lib/ori/v1/validate.ts
 */
import type { NormalizedTokenData } from "@/lib/data/types";
import { COVERAGE_THRESHOLD, ORI_METHODOLOGY_VERSION } from "./config";
import { computeOriV1, computeOriV1FromMetrics } from "./compute";
import { robustZ } from "./normalize";
import type { MetricObservation } from "./types";

function fail(message: string): never {
  throw new Error(message);
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) fail(message);
}

function close(a: number, b: number, eps = 0.6): boolean {
  return Math.abs(a - b) <= eps;
}

function available(
  metricId: string,
  category: MetricObservation["category"],
  weight: number,
  score: number,
  extras: Partial<MetricObservation> = {}
): MetricObservation {
  const structuralOrDynamic =
    category === "market" ||
    category === "liquidity" ||
    category === "onChain" ||
    category === "protocol"
      ? "dynamic"
      : "structural";
  return {
    metricId,
    category,
    structuralOrDynamic,
    weight,
    applicability: "AVAILABLE",
    normalization: "ABS",
    directionality: "HIGH",
    evidenceMode: "AUTOMATED",
    sourceTier: "B",
    source: "test",
    observedAt: "2026-01-01T00:00:00.000Z",
    rawValue: score,
    normalizedScore: score,
    availability: "AVAILABLE",
    ...extras,
  };
}

function run(): void {
  const complete: MetricObservation[] = [
    available("tok", "tokenomics", 1, 80),
    available("own", "ownership", 1, 70),
    available("gov", "governance", 1, 60),
    available("res", "resilience", 1, 90),
    available("ins", "institutional", 1, 50),
    available("mkt", "market", 1, 80),
    available("liq", "liquidity", 1, 70),
    available("onc", "onChain", 1, 60),
    available("pro", "protocol", 1, 50),
  ];

  const a = computeOriV1FromMetrics(complete, { peerClass: "DeFi" });
  const structural = 0.25 * 80 + 0.2 * 70 + 0.2 * 60 + 0.25 * 90 + 0.1 * 50;
  const dynamic = 0.3 * 80 + 0.3 * 70 + 0.2 * 60 + 0.2 * 50;
  const base = 0.4 * structural + 0.6 * dynamic;
  assert(a.methodologyVersion === ORI_METHODOLOGY_VERSION, "G: version");
  assert(a.publicationStatus === "published", "A: published");
  assert(a.structuralScore != null && close(a.structuralScore, structural), "A: structural");
  assert(a.dynamicScore != null && close(a.dynamicScore, dynamic), "A: dynamic");
  assert(a.baseOri != null && close(a.baseOri, base), "A: base");
  assert(a.finalOri != null && close(a.finalOri, base), "A: final equals base");

  const missingOwn = complete.map((m) =>
    m.metricId === "own"
      ? { ...m, availability: "UNAVAILABLE" as const, normalizedScore: null }
      : m
  );
  const b = computeOriV1FromMetrics(missingOwn, { peerClass: "DeFi" });
  const structuralB = (0.25 * 80 + 0.2 * 60 + 0.25 * 90 + 0.1 * 50) / (0.25 + 0.2 + 0.25 + 0.1);
  assert(b.structuralScore != null && close(b.structuralScore, structuralB), "B: renormalize");
  assert(b.weightedCoverage < a.weightedCoverage, "B: coverage falls");
  assert(b.confidence.overall !== a.confidence.overall, "B: confidence changes");
  assert(b.baseOri != null && b.finalOri != null, "B: still publishes if coverage ok");

  const naOwn = complete.map((m) =>
    m.metricId === "own"
      ? {
          ...m,
          applicability: "NOT_APPLICABLE" as const,
          availability: "NOT_APPLICABLE" as const,
          normalizedScore: null,
        }
      : m
  );
  const c = computeOriV1FromMetrics(naOwn, { peerClass: "L1" });
  assert(close(c.weightedCoverage, a.weightedCoverage), "C: N/A does not reduce coverage");

  const thin: MetricObservation[] = [
    available("mkt", "market", 1, 80),
    {
      ...available("liq", "liquidity", 1, 70),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("onc", "onChain", 1, 60),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("pro", "protocol", 1, 50),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("tok", "tokenomics", 1, 80),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("own", "ownership", 1, 70),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("gov", "governance", 1, 60),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("res", "resilience", 1, 90),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
    {
      ...available("ins", "institutional", 1, 50),
      availability: "UNAVAILABLE",
      normalizedScore: null,
    },
  ];
  const d = computeOriV1FromMetrics(thin);
  assert(d.weightedCoverage < COVERAGE_THRESHOLD, "D: coverage below 60%");
  assert(d.publicationStatus === "insufficient_data", "D: insufficient");
  assert(d.finalOri == null, "D: no published final ORI");

  const e = computeOriV1FromMetrics(complete, {
    events: [{ id: "exploit", label: "Protocol exploit", severity: "high", penalty: 10 }],
  });
  assert(e.baseOri != null && close(e.baseOri, base), "E: base preserved");
  assert(e.eventAdjustment === -10, "E: adjustment");
  assert(e.finalOri != null && close(e.finalOri, base - 10), "E: final");

  const stale = complete.map((m) => ({
    ...m,
    sourceTier: "D" as const,
    observedAt: "2020-01-01T00:00:00.000Z",
  }));
  const f = computeOriV1FromMetrics(stale);
  assert(f.baseOri != null && a.baseOri != null && close(f.baseOri, a.baseOri), "F: base unchanged");
  assert(f.confidence.overall < a.confidence.overall, "F: confidence drops");
  assert(f.confidence.sourceQuality < a.confidence.sourceQuality, "F: source quality");

  const z = robustZ(10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert(z != null && z > 0, "robust Z defined");

  const l1Unavailable = complete.map((m) =>
    m.metricId === "own" ||
    m.metricId === "gov" ||
    m.metricId === "onc" ||
    m.metricId === "pro"
      ? { ...m, availability: "UNAVAILABLE" as const, normalizedScore: null }
      : m
  );
  const l1u = computeOriV1FromMetrics(l1Unavailable, { peerClass: "L1" });
  assert(l1u.weightedCoverage < a.weightedCoverage, "L1: UNAVAILABLE stays in coverage denom");
  assert(
    !close(l1u.weightedCoverage, c.weightedCoverage, 0.01),
    "L1: UNAVAILABLE is not treated as N/A"
  );

  const now = "2026-09-23T00:00:00.000Z";
  const market = {
    price: 100,
    marketCap: 2e11,
    fdv: 2.2e11,
    volume24h: 8e9,
    circulatingSupply: 19e6,
    totalSupply: 21e6,
    priceChange24h: -1.2,
    source: "CoinGecko",
    lastUpdated: now,
  };
  const cgOnly: NormalizedTokenData = {
    market,
    protocol: null,
    holders: null,
    governance: null,
    developer: null,
    tally: null,
    cryptorank: null,
  };
  const ethWithGithub: NormalizedTokenData = {
    ...cgOnly,
    developer: {
      repoUrl: "ethereum/go-ethereum",
      stars: 48000,
      forks: 20000,
      contributors: 800,
      commits90d: 400,
      openIssues: 300,
      closedIssues90d: 200,
      lastCommitDate: now,
      recentReleaseDate: now,
      source: "GitHub",
      lastUpdated: now,
    },
  };
  const uniFull: NormalizedTokenData = {
    market: { ...market, marketCap: 6e9, fdv: 8e9, volume24h: 4e8 },
    protocol: {
      tvl: 4e9,
      tvlChange7d: -3,
      fees24h: 2e6,
      revenue24h: 8e5,
      revenue30d: 2.4e7,
      category: "DEX",
      chain: "ethereum",
      source: "DeFiLlama",
      lastUpdated: now,
      meta: {
        source: "DeFiLlama",
        endpointType: "api",
        lastUpdated: now,
        available: true,
      },
    },
    holders: {
      holderCount: 420000,
      top10HolderPercent: 38,
      top25HolderPercent: 52,
      top50HolderPercent: 64,
      contractAgeDays: 1900,
      verifiedContract: true,
      source: "Etherscan",
      lastUpdated: now,
      meta: {
        source: "Etherscan",
        endpointType: "api",
        lastUpdated: now,
        available: true,
      },
    },
    governance: {
      proposalCount: 48,
      activeProposals: 2,
      recentProposalCount90d: 6,
      averageVoterTurnout: 2400,
      uniqueVoters: 9000,
      governanceActivityScore: 72,
      source: "Snapshot",
      lastUpdated: now,
      meta: {
        source: "Snapshot",
        endpointType: "api",
        lastUpdated: now,
        available: true,
      },
    },
    developer: {
      repoUrl: "Uniswap/v3-core",
      stars: 4000,
      forks: 2500,
      contributors: 120,
      commits90d: 80,
      openIssues: 40,
      closedIssues90d: 30,
      lastCommitDate: now,
      recentReleaseDate: now,
      source: "GitHub",
      lastUpdated: now,
    },
    tally: null,
    cryptorank: null,
  };

  const btc = computeOriV1(cgOnly, "BTC");
  const eth = computeOriV1(ethWithGithub, "ETH");
  const sol = computeOriV1(cgOnly, "SOL");
  const uni = computeOriV1(uniFull, "UNI");

  assert(btc.publicationStatus === "insufficient_data", "BTC: CoinGecko-only L1 unpublished");
  assert(eth.publicationStatus === "insufficient_data", "ETH: L1 + GitHub still unpublished");
  assert(sol.publicationStatus === "insufficient_data", "SOL: CoinGecko-only L1 unpublished");
  assert(uni.publicationStatus === "published", "UNI: representative DeFi publishes");
  assert(btc.weightedCoverage < COVERAGE_THRESHOLD, "BTC coverage < 60%");
  assert(eth.weightedCoverage < COVERAGE_THRESHOLD, "ETH coverage < 60%");
  assert(sol.weightedCoverage < COVERAGE_THRESHOLD, "SOL coverage < 60%");
  assert(uni.weightedCoverage >= COVERAGE_THRESHOLD, "UNI coverage >= 60%");

  for (const [label, result] of [
    ["BTC", btc],
    ["ETH", eth],
    ["SOL", sol],
    ["UNI", uni],
  ] as const) {
    const rows = result.metrics
      .filter((m) => !m.future)
      .map(
        (m) =>
          `    ${m.metricId.padEnd(28)} ${m.applicability.padEnd(16)} ${m.availability.padEnd(14)} ${m.normalizedScore ?? "—"}`
      )
      .join("\n");
    console.log(
      `${label} coverage=${(result.weightedCoverage * 100).toFixed(1)}% status=${result.publicationStatus}\n${rows}`
    );
  }

  console.log("ORI Methodology v1.0 engine cases passed (A–G).");
}

run();
