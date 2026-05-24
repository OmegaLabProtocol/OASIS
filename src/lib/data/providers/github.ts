import { nowIso, providerFetch, providerMeta } from "../fetch";
import type { DeveloperActivityData } from "../types";

export async function fetchDeveloperActivity(
  repo: string
): Promise<DeveloperActivityData | null> {
  const [owner, name] = repo.split("/");
  if (!owner || !name) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const repoData = await providerFetch<{
    stargazers_count?: number;
    forks_count?: number;
    open_issues_count?: number;
    pushed_at?: string;
    html_url?: string;
  }>(`https://api.github.com/repos/${owner}/${name}`, {
    headers,
    cacheSeconds: 3600,
  });

  const commits = await providerFetch<Array<{ commit: { author: { date: string } } }>>(
    `https://api.github.com/repos/${owner}/${name}/commits?since=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}&per_page=100`,
    { headers, cacheSeconds: 3600 }
  );

  const contributors = await providerFetch<unknown[]>(
    `https://api.github.com/repos/${owner}/${name}/contributors?per_page=100`,
    { headers, cacheSeconds: 3600 }
  );

  const releases = await providerFetch<Array<{ published_at: string }>>(
    `https://api.github.com/repos/${owner}/${name}/releases?per_page=5`,
    { headers, cacheSeconds: 3600 }
  );

  const hasData = !!repoData;

  return {
    repoUrl: repoData?.html_url ?? `https://github.com/${owner}/${name}`,
    stars: repoData?.stargazers_count ?? null,
    forks: repoData?.forks_count ?? null,
    contributors: contributors?.length ?? null,
    commits90d: commits?.length ?? null,
    openIssues: repoData?.open_issues_count ?? null,
    closedIssues90d: null,
    lastCommitDate: repoData?.pushed_at ?? null,
    recentReleaseDate: releases?.[0]?.published_at ?? null,
    source: "GitHub",
    lastUpdated: nowIso(),
    meta: providerMeta("GitHub", "repos/{owner}/{repo}", hasData),
  };
}
