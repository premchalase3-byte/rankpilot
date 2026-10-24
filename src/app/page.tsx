"use client";

import { useState } from "react";

const projects = [
  { name: "premspencilart.in", status: "Ready to audit", score: "—" },
  { name: "Add your website", status: "Create a project", score: "—" },
];

const activities = [
  { title: "Technical SEO audit", detail: "Find crawling and indexing issues", icon: "⌕" },
  { title: "Keyword research", detail: "Discover keywords worth targeting", icon: "⌘" },
  { title: "Competitor analysis", detail: "Compare your website with competitors", icon: "⇄" },
  { title: "Content insights", detail: "Find opportunities to improve your pages", icon: "✳" },
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [showProject, setShowProject] = useState(false);
  const [domain, setDomain] = useState("");

  const navigation = [
    { label: "Overview", icon: "▦" },
    { label: "Projects", icon: "▣" },
    { label: "Site Audit", icon: "⌕" },
    { label: "Keywords", icon: "⌘" },
    { label: "Competitors", icon: "⇄" },
    { label: "Content", icon: "✳" },
    { label: "Reports", icon: "▤" },
  ];

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
              onClick={() => setActive(item.label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                active === item.label
                  ? "border border-cyan-300/15 bg-cyan-300/10 font-medium text-cyan-300"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-lg">{item.icon}</span>
              {item.label}
              {item.label === "Site Audit" && (
                <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-500">
                  NEW
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="mb-2 text-sm font-semibold">Unlock more insights</div>
          <p className="mb-4 text-xs leading-5 text-slate-500">
            Advanced audits, keyword opportunities and competitor intelligence.
          </p>
          <button
            onClick={() => setActive("Plans")}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/[0.06]"
          >
            Explore plans ↗
          </button>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold">P</div>
          <div>
            <div className="text-sm font-medium">Your workspace</div>
            <div className="text-xs text-slate-500">Free plan · Preview</div>
          </div>
        </div>
      </aside>

      <section className="lg:ml-64">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-white/[0.07] bg-[#080b12]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="text-sm text-slate-500">
            Workspace <span className="mx-2 text-slate-700">/</span>
            <span className="text-slate-200">{active}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 sm:inline-flex">
              ◉ Demo interface
            </span>
            <button
              onClick={() => setShowProject(true)}
              className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              + Add project
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                Search intelligence platform
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your SEO command center<span className="text-cyan-300">.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Find what&apos;s holding your website back. Discover issues,
                uncover opportunities and turn search data into action.
              </p>
            </div>
            <button
              onClick={() => setShowProject(true)}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium hover:bg-white/[0.07]"
            >
              Start an SEO audit ↗
            </button>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Tracked websites", value: "—", note: "No projects connected", icon: "◎" },
              { label: "SEO health score", value: "—", note: "Requires a real audit", icon: "◉" },
              { label: "Keywords tracked", value: "—", note: "No keyword data yet", icon: "⌘" },
              { label: "Issues discovered", value: "—", note: "Run your first audit", icon: "⌁" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm text-slate-400">{metric.label}</span>
                  <span className="text-xl text-slate-500">{metric.icon}</span>
                </div>
                <div className="text-3xl font-semibold tracking-tight">{metric.value}</div>
                <div className="mt-2 text-xs text-slate-500">{metric.note}</div>
              </div>
            ))}
          </div>

          <div className="mb-8 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">SEO performance</h2>
                  <p className="mt-1 text-sm text-slate-500">Your search visibility over time</p>
                </div>
                <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-500">
                  Last 30 days
                </span>
              </div>
              <div className="flex min-h-52 flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] text-2xl text-cyan-300">
                  ↗
                </div>
                <div className="text-sm font-medium">Your data starts here</div>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Connect a website and run an audit before performance insights appear.
                </p>
              </div>
              <div className="grid grid-cols-3 border-t border-white/[0.07] pt-4 text-center">
                <div><div className="text-lg font-semibold">—</div><div className="mt-1 text-xs text-slate-500">Clicks</div></div>
                <div className="border-x border-white/[0.07]"><div className="text-lg font-semibold">—</div><div className="mt-1 text-xs text-slate-500">Impressions</div></div>
                <div><div className="text-lg font-semibold">—</div><div className="mt-1 text-xs text-slate-500">Avg. position</div></div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Quick actions</h2>
                <p className="mt-1 text-sm text-slate-500">Choose your next SEO move</p>
              </div>
              <div className="space-y-3">
                {activities.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => item.title === "Technical SEO audit" ? setShowProject(true) : setActive(item.title)}
                    className="flex w-full items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-lg text-cyan-300">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                    </span>
                    <span className="text-slate-600">↗</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-white/[0.08] bg-[#0d111b] p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your projects</h2>
                <p className="mt-1 text-sm text-slate-500">Manage the websites you want to grow</p>
              </div>
              <button onClick={() => setShowProject(true)} className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                + New project
              </button>
            </div>
            <div className="divide-y divide-white/[0.07]">
              {projects.slice(1).map((project) => (
                <div key={project.name} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-lg">◎</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{project.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{project.status}</div>
                    </div>
                  </div>
                  <button onClick={() => setShowProject(true)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05]">
                    Configure
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-cyan-300/[0.08] to-transparent p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Your next step</div>
                <h2 className="text-xl font-semibold">Turn your website into an SEO growth engine.</h2>
                <p className="mt-2 text-sm text-slate-400">Start with a website, then uncover the issues and opportunities that matter.</p>
              </div>
              <button onClick={() => setShowProject(true)} className="shrink-0 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                Add your first website ↗
              </button>
            </div>
          </div>

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
              Start a project to prepare for a technical SEO audit.
            </p>
            <form onSubmit={(event) => { event.preventDefault(); setShowProject(false); setActive("Projects"); }} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Website URL
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                />
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProject(false)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/[0.05]">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                  Continue
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Preview only: this form does not save the project yet. We&apos;ll connect it to the database in a later step.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}