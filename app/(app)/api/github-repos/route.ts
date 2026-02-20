import { NextResponse } from "next/server";
import { ServerCache } from "@/lib/server-cache";

const TTL_12H = 12 * 60 * 60 * 1000;
const reposCache = new ServerCache<GitHubRepo[]>(TTL_12H);

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  topics: string[];
}

async function fetchRepos(): Promise<GitHubRepo[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    "https://api.github.com/orgs/Claude-PSU/repos?sort=updated&per_page=6&type=public",
    { headers }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.map((repo: GitHubRepo) => ({
    id: repo.id,
    name: repo.name,
    description: repo.description,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
    language: repo.language,
    updated_at: repo.updated_at,
    topics: repo.topics ?? [],
  }));
}

export async function GET() {
  try {
    const repos = await reposCache.get("claude-psu-repos", fetchRepos);
    return NextResponse.json({ repos });
  } catch (err) {
    console.error("GitHub repos fetch failed:", err);
    return NextResponse.json({ repos: [], error: true });
  }
}
