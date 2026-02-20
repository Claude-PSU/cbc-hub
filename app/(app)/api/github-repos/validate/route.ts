import { NextRequest, NextResponse } from "next/server";

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid GitHub URL — must be github.com/owner/repo" },
      { status: 400 }
    );
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [repoRes, readmeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
    ]);

    if (repoRes.status === 404) {
      return NextResponse.json(
        { error: "Repository not found or is private" },
        { status: 404 }
      );
    }
    if (!repoRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${repoRes.status}` },
        { status: 502 }
      );
    }

    const repoData = await repoRes.json();
    if (repoData.private) {
      return NextResponse.json(
        { error: "Repository is private — only public repos can be submitted" },
        { status: 400 }
      );
    }

    let readmeExcerpt = "";
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      const content = Buffer.from(readmeData.content, "base64").toString("utf-8");
      readmeExcerpt = content
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]+`/g, "")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_~]/g, "")
        .replace(/\n+/g, " ")
        .trim()
        .slice(0, 500);
    }

    return NextResponse.json({
      owner,
      repo,
      suggestedTitle: repoData.name.replace(/-/g, " ").replace(/_/g, " "),
      language: repoData.language ?? null,
      stars: repoData.stargazers_count,
      lastCommit: repoData.pushed_at,
      readmeExcerpt,
    });
  } catch (err) {
    console.error("GitHub validate error:", err);
    return NextResponse.json({ error: "Failed to reach GitHub API" }, { status: 502 });
  }
}
