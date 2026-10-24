
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  website_url: string;
  created_at: string;
  updated_at?: string;
};

type SeoIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
};

type CrawledPage = {
  url: string;
  status: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1Texts: string[];
  canonical: string | null;
  robotsMeta: string | null;
  wordCount: number;
  internalLinks: number;
  brokenInternalLinks: number;
  issues: SeoIssue[];
};

type CrawlResult = {
  startUrl: string;
  finishedAt: string;
  pagesScanned: number;
  pages: CrawledPage[];
  discoveredUrls: number;
  truncated: boolean;
  errors: string[];
};

type AuditRecord = {
  id: string;
  project_id: string;
  status: "completed" | "failed";
  pages_scanned: number;
  results: CrawlResult;
  created_at: string;
};

type NavigationItem = {
  label: string;
  icon: string;
};

const navigation: NavigationItem[] = [
  { label: "Overview", icon: "⌂" },
  { label: "Projects", icon: "▦" },
  { label: "Site Audit", icon: "⌁" },
  { label: "Keywords", icon: "⌕" },
  { label: "Competitors", icon: "◎" },
  { label: "Reports", icon: "▤" },
  { label: "Plans", icon: "◇" },
];

const upcomingFeatures: Record<string, string> = {
  Keywords:
    "Keyword discovery, search volume, difficulty, and ranking tracking are planned for a future release.",
  Competitors:
    "Competitor domain analysis and keyword gap discovery are planned for a future release.",
  Plans:
    "Subscription plans and billing are not connected yet.",
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString();
}

function getIssueCount(
  pages: CrawledPage[],
  severity: SeoIssue["severity"]
): number {
  return pages.reduce(
    (total, page) =>
      total +
      page.issues.filter((issue) => issue.severity === severity).length,
    0
  );
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status >= 300 && status < 400) {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-red-400/20 bg-red-400/10 text-red-300";
}

function severityClass(severity: SeoIssue["severity"]): string {
  if (severity === "error") {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (severity === "warning") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-sky-400/20 bg-sky-400/10 text-sky-300";
}

export default function DashboardPage() {
  const [active, setActive] = useState("Overview");

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [showProject, setShowProject] = useState(false);
  const [domain, setDomain] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null
  );
  const [auditingProjectId, setAuditingProjectId] = useState<string | null>(
    null
  );

  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditsLoaded, setAuditsLoaded] = useState(false);

  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectMessage, setProjectMessage] = useState("");

  const [auditError, setAuditError] = useState("");
  const [auditMessage, setAuditMessage] = useState("");

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);

    try {
      const response = await fetch("/api/projects", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load projects.");
      }

      setProjects(result.projects ?? []);
      setProjectError("");
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Unable to load projects."
      );
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadAudits = useCallback(async (projectId?: string) => {
    setAuditsLoading(true);
    setAuditError("");

    try {
      const params = new URLSearchParams();

      if (projectId) {
        params.set("project_id", projectId);
      }

      const query = params.toString();
      const response = await fetch(
        query ? `/api/audits?${query}` : "/api/audits",
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load audit history.");
      }

      setAudits(result.audits ?? []);
      setAuditsLoaded(true);
    } catch (error) {
      setAuditError(
        error instanceof Error ? error.message : "Unable to load audit history."
      );
    } finally {
      setAuditsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function handleAddProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProject(true);
    setProjectError("");
    setProjectMessage("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: domain.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create project.");
      }

      if (!result.project) {
        throw new Error("The server did not return the saved project.");
      }

      setProjects((current) => [
        result.project,
        ...current.filter(
          (project) => project.id !== result.project.id
        ),
      ]);

      setDomain("");
      setShowProject(false);
      setActive("Projects");
      setProjectMessage("Website added successfully.");
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : "Unable to create project. Please try again."
      );
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"?\n\nIts saved audit history will also be deleted. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingProjectId(project.id);
    setProjectError("");
    setProjectMessage("");
    setAuditError("");

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete project.");
      }

      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );

      setAudits((current) =>
        current.filter((audit) => audit.project_id !== project.id)
      );

      if (selectedAudit?.project_id === project.id) {
        setSelectedAudit(null);
      }

      setProjectMessage(`${project.name} was deleted.`);
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Unable to delete project."
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function handleRunAudit(project: Project) {
    setAuditingProjectId(project.id);
    setAuditError("");
    setAuditMessage("");
    setProjectError("");
    setSelectedAudit(null);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "The SEO audit failed.");
      }

      const savedAudit = result.audit as AuditRecord | undefined;

      if (!savedAudit?.id || !savedAudit.results) {
        throw new Error(
          "The server response did not contain a saved audit report."
        );
      }

      setAudits((current) => [
        savedAudit,
        ...current.filter((item) => item.id !== savedAudit.id),
      ]);

      setAuditsLoaded(true);
      setSelectedAudit(savedAudit);
      setActive("Reports");
      setAuditMessage(
        `Audit completed. ${savedAudit.pages_scanned} pages were scanned.`
      );
    } catch (error) {
      setAuditError(
        error instanceof Error
          ? error.message
          : "The SEO audit could not be completed."
      );
    } finally {
      setAuditingProjectId(null);
    }
  }

  async function openAuditHistory(projectId?: string) {
    setActive(projectId ? "Site Audit" : "Reports");
    setSelectedAudit(null);
    setAuditMessage("");
    await loadAudits(projectId);
  }

  async function handleLogout() {
    setSigningOut(true);
    setProjectError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      window.location.href = "/auth";
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Unable to sign out."
      );
      setSigningOut(false);
    }
  }

  function openProjectModal() {
    setProjectError("");
    setProjectMessage("");
    setShowProject(true);
  }

  function selectNavigation(label: string) {
    setActive(label);
    setProjectError("");
    setAuditError("");
    setAuditMessage("");
    setSelectedAudit(null);

    if (label === "Reports") {
      void loadAudits();
    } else if (label === "Site Audit") {
      void loadAudits();
    }
  }

  function renderProjects() {
    if (projectsLoading) {
      return (
        <p className="py-8 text-sm text-slate-500">
          Loading your projects...
        </p>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="text-sm font-medium">No websites added yet</p>
          <p className="mt-2 text-xs text-slate-500">
            Add a website to start your SEO workspace.
          </p>
          <button
            onClick={openProjectModal}
            className="mt-4 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
          >
            Add your first website
          </button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-white/[0.07]">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-lg text-cyan-300">
                ◎
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {project.name}
                </div>
                <a
                  href={project.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-xs text-slate-500 hover:text-cyan-300"
                >
                  {project.website_url}
                </a>
                <div className="mt-1 text-xs text-slate-600">
                  Added {formatDate(project.created_at)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                onClick={() => void handleRunAudit(project)}
                disabled={
                  auditingProjectId !== null || deletingProjectId !== null
                }
                className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {auditingProjectId === project.id
                  ? "Crawling..."
                  : "Run SEO audit"}
              </button>

              <button
                onClick={() => void openAuditHistory(project.id)}
                disabled={auditingProjectId !== null}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
              >
                View reports
              </button>

              <button
                onClick={() => void handleDeleteProject(project)}
                disabled={
                  deletingProjectId !== null || auditingProjectId !== null
                }
                className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50"
              >
                {deletingProjectId === project.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderAuditReport(audit: AuditRecord) {
    const result = audit.results;
    const pages = Array.isArray(result?.pages) ? result.pages : [];
    const errors = Array.isArray(result?.errors) ? result.errors : [];

    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <button
              onClick={() => {
                setSelectedAudit(null);
                setActive("Reports");
              }}
              className="mb-3 text-xs text-cyan-300 hover:text-cyan-200"
            >
              ← Back to reports
            </button>

            <h2 className="text-xl font-semibold">Technical SEO report</h2>
            <p className="mt-2 break-all text-sm text-slate-400">
              {result?.startUrl || "Website audit"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Completed {formatDate(audit.created_at)}
            </p>
          </div>

          <span className="w-fit rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
            Saved report
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Pages scanned", value: pages.length },
            { label: "Errors", value: getIssueCount(pages, "error") },
            { label: "Warnings", value: getIssueCount(pages, "warning") },
            { label: "Informational", value: getIssueCount(pages, "info") },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <div className="text-xs text-slate-500">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold">
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {result?.truncated && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
            The crawl reached a configured limit. Some discovered pages may
            not have been scanned.
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <h3 className="text-sm font-semibold text-amber-200">
              Crawl notices ({errors.length})
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
              {errors.map((error, index) => (
                <li key={`${index}-${error}`} className="break-words">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pages.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] p-6 text-sm text-slate-400">
            No HTML pages were successfully analyzed. Check the crawl notices
            above and try again.
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page, index) => (
              <div
                key={`${page.url}-${index}`}
                className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      {page.url}
                    </a>
                    <p className="mt-2 break-words text-sm text-slate-300">
                      {page.title || "No page title found"}
                    </p>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-md border px-2.5 py-1 text-xs ${statusClass(
                      page.status
                    )}`}
                  >
                    HTTP {page.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-black/20 p-3">
                    <div className="text-slate-500">Meta description</div>
                    <div className="mt-1 break-words text-slate-300">
                      {page.metaDescription || "Missing"}
                    </div>
                    <div className="mt-1 text-slate-500">
                      {page.metaDescriptionLength} characters
                    </div>
                  </div>

                  <div className="rounded-lg bg-black/20 p-3">
                    <div className="text-slate-500">Headings and content</div>
                    <div className="mt-1 text-slate-300">
                      H1 headings: {page.h1Count}
                    </div>
                    <div className="mt-1 text-slate-300">
                      Approximate words: {page.wordCount}
                    </div>
                    {page.h1Texts.length > 0 && (
                      <div className="mt-2 break-words text-slate-400">
                        {page.h1Texts.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 break-all text-xs text-slate-500">
                  Canonical: {page.canonical || "Not declared"}
                </div>

                <div className="mt-1 break-words text-xs text-slate-500">
                  Robots: {page.robotsMeta || "No robots meta tag detected"}
                  {" · "}Internal links: {page.internalLinks}
                </div>

                <div className="mt-4 space-y-2">
                  {page.issues.length === 0 ? (
                    <p className="text-xs text-emerald-300">
                      No issues detected by the current checks.
                    </p>
                  ) : (
                    page.issues.map((issue, issueIndex) => (
                      <div
                        key={`${issue.code}-${issueIndex}`}
                        className="flex flex-col gap-2 sm:flex-row sm:items-start"
                      >
                        <span
                          className={`w-fit shrink-0 rounded-md border px-2 py-1 text-[10px] uppercase ${severityClass(
                            issue.severity
                          )}`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs leading-5 text-slate-300">
                          {issue.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Findings are based on the HTML returned to the crawler and the
          current checks. They are not a Google ranking score or a guarantee
          of how search engines will index the site.
        </p>
      </div>
    );
  }

  function renderAuditHistory() {
    if (auditsLoading) {
      return (
        <p className="py-8 text-sm text-slate-500">
          Loading saved audit reports...
        </p>
      );
    }

    if (audits.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="text-sm font-medium">No saved reports yet</p>
          <p className="mt-2 text-xs text-slate-500">
            Go to Projects and run an SEO audit to create your first report.
          </p>
          <button
            onClick={() => setActive("Projects")}
            className="mt-4 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
          >
            Open projects
          </button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-white/[0.07]">
        {audits.map((audit) => {
          const project = projects.find(
            (item) => item.id === audit.project_id
          );
          const result = audit.results;

          return (
            <div
              key={audit.id}
              className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {project?.name || "Website audit"}
                </div>
                <div className="mt-1 break-all text-xs text-slate-500">
                  {project?.website_url || result?.startUrl || "Unknown website"}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {formatDate(audit.created_at)}
                  {" · "}
                  {audit.pages_scanned} pages scanned
                </div>
              </div>

              <button
                onClick={() => setSelectedAudit(audit)}
                className="w-fit rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-300/10"
              >
                Open report →
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const pageTitles: Record<string, string> = {
    Overview: "Your SEO command center",
    Projects: "Your websites",
    "Site Audit": "Technical SEO audits",
    Reports: "Audit reports",
    Keywords: "Keyword research",
    Competitors: "Competitor intelligence",
    Plans: "RankPilot plans",
  };

  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b0e16] p-5 lg:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-slate-950">
            R
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">RankPilot</div>
            <div className="text-xs text-slate-500">SEO intelligence</div>
          </div>
        </div>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => (
            <button
              key={item.label}
              onClick={() => selectNavigation(item.label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                active === item.label
                  ? "border border-cyan-300/15 bg-cyan-300/10 font-medium text-cyan-300"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-lg">{item.icon}</span>
              {item.label}
              {["Keywords", "Competitors", "Plans"].includes(item.label) && (
                <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] text-slate-500">
                  SOON
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="mb-2 text-sm font-semibold">
            Build your SEO visibility
          </div>
          <p className="mb-4 text-xs leading-5 text-slate-500">
            Start with a technical crawl, then fix the issues it discovers.
          </p>
          <button
            onClick={() => selectNavigation("Site Audit")}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/[0.06]"
          >
            Open site audits ↗
          </button>
        </div>

        <div className="mt-5 border-t border-white/[0.07] pt-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold">
              P
            </div>
            <div>
              <div className="text-sm font-medium">Your workspace</div>
              <div className="text-xs text-slate-500">Free plan</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <section className="lg:ml-64">
        <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#080b12]/90 px-5 py-3 backdrop-blur-xl sm:px-8">
          <div className="text-sm text-slate-500">
            Workspace
            <span className="mx-2 text-slate-700">/</span>
            <span className="text-slate-200">{active}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 sm:inline-flex">
              Supabase connected
            </span>
            <button
              onClick={openProjectModal}
              className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              + Add project
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Search intelligence platform
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {selectedAudit ? "Audit report" : pageTitles[active]}
              <span className="text-cyan-300">.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              {selectedAudit
                ? "Review page-level technical SEO findings from this saved crawl."
                : active === "Overview"
                  ? "Manage your websites, run technical crawls, and review real audit findings."
                  : active === "Projects"
                    ? "Add, audit, review, or remove your tracked websites."
                    : active === "Site Audit"
                      ? "Run a multi-page technical crawl against one of your saved websites."
                      : active === "Reports"
                        ? "Open previous audits saved to your account."
                        : upcomingFeatures[active] || ""}
            </p>
          </div>

          {projectError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300"
            >
              {projectError}
            </div>
          )}

          {projectMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300"
            >
              {projectMessage}
            </div>
          )}

          {auditError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300"
            >
              {auditError}
            </div>
          )}

          {auditMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300"
            >
              {auditMessage}
            </div>
          )}

          {selectedAudit ? (
            renderAuditReport(selectedAudit)
          ) : active === "Overview" ? (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Tracked websites",
                    value: projectsLoading ? "…" : String(projects.length),
                    note: "Saved projects",
                    icon: "◎",
                  },
                  {
                    label: "Saved audits",
                    value: auditsLoaded ? String(audits.length) : "—",
                    note: auditsLoaded ? "Available reports" : "Load reports to count",
                    icon: "▤",
                  },
                  {
                    label: "Pages scanned",
                    value: auditsLoaded
                      ? String(
                          audits.reduce(
                            (total, audit) => total + audit.pages_scanned,
                            0
                          )
                        )
                      : "—",
                    note: "Across loaded reports",
                    icon: "⌁",
                  },
                  {
                    label: "SEO health score",
                    value: "—",
                    note: "Scoring model not implemented",
                    icon: "◉",
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-5"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {metric.label}
                      </span>
                      <span className="text-xl text-slate-500">
                        {metric.icon}
                      </span>
                    </div>
                    <div className="text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {metric.note}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
                  <h2 className="text-lg font-semibold">Get started</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Add a website, run a technical crawl, and review
                    the actual page-level findings.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => selectNavigation("Projects")}
                      className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"
                    >
                      Manage projects
                    </button>
                    <button
                      onClick={() => selectNavigation("Reports")}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/[0.05]"
                    >
                      View reports
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
                  <h2 className="text-lg font-semibold">Audit coverage</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    The current crawler checks HTML metadata, headings,
                    canonical declarations, robots meta tags, content length,
                    and HTTP status.
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Search performance metrics, keyword rankings, and
                    competitor data are not connected yet.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Your projects</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Start an audit or manage a website.
                    </p>
                  </div>
                  <button
                    onClick={() => selectNavigation("Projects")}
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    All projects →
                  </button>
                </div>
                {renderProjects()}
              </div>
            </>
          ) : active === "Projects" ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Tracked websites</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {projects.length} saved website
                    {projects.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={openProjectModal}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/[0.05]"
                >
                  + Add website
                </button>
              </div>
              {renderProjects()}
            </div>
          ) : active === "Site Audit" ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Choose a website</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Each audit starts from the saved project URL.
                </p>
              </div>
              {renderProjects()}
              <div className="mt-6 border-t border-white/[0.07] pt-5">
                <h3 className="text-sm font-semibold">Recent audit history</h3>
                <button
                  onClick={() => void openAuditHistory()}
                  className="mt-3 text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Load saved reports →
                </button>
              </div>
            </div>
          ) : active === "Reports" ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Saved audit reports</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Reports stored in your Supabase database.
                  </p>
                </div>
                <button
                  onClick={() => void loadAudits()}
                  disabled={auditsLoading}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/[0.05] disabled:opacity-50"
                >
                  {auditsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {renderAuditHistory()}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-8">
              <div className="mb-3 inline-flex rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-200">
                Upcoming feature
              </div>
              <h2 className="text-xl font-semibold">
                {pageTitles[active] || active}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                {upcomingFeatures[active] ||
                  "This feature is not available yet."}
              </p>
              <button
                onClick={() => selectNavigation("Overview")}
                className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/[0.05]"
              >
                Back to overview
              </button>
            </div>
          )}

          <footer className="flex flex-col gap-2 py-8 text-xs text-slate-600 sm:flex-row sm:justify-between">
            <span>© 2026 RankPilot. Built for smarter search decisions.</span>
            <span>SEO intelligence · Data transparency first</span>
          </footer>
        </div>
      </section>

      {showProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101521] p-6 shadow-2xl">
            <div className="mb-2 text-xl font-semibold">Add a website</div>
            <p className="mb-6 text-sm leading-6 text-slate-400">
              Save a website to your workspace before running its SEO audit.
            </p>

            <form onSubmit={handleAddProject} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Website URL
                <input
                  type="url"
                  required
                  maxLength={2048}
                  placeholder="https://example.com"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />
              </label>

              {projectError && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300"
                >
                  {projectError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={savingProject}
                  onClick={() => {
                    setShowProject(false);
                    setProjectError("");
                  }}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/[0.05] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProject ? "Saving..." : "Add website"}
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Only add websites you own or are authorized to audit.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
