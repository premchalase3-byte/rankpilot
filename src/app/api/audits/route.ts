
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crawlWebsite } from "@/lib/seo-crawler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in to view audit reports." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");

  if (
    projectId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      projectId
    )
  ) {
    return NextResponse.json(
      { error: "Invalid project ID." },
      { status: 400 }
    );
  }

  let query = supabase
    .from("audit_runs")
    .select("id, project_id, status, pages_scanned, results, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Load audits failed:", error.message);

    return NextResponse.json(
      { error: "Unable to load audit history." },
      { status: 500 }
    );
  }

  return NextResponse.json({ audits: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in before starting an audit." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("project_id" in body) ||
    typeof body.project_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.project_id
    )
  ) {
    return NextResponse.json(
      { error: "A valid project ID is required." },
      { status: 400 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, website_url")
    .eq("id", body.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError) {
    console.error("Project lookup failed:", projectError.message);

    return NextResponse.json(
      { error: "Unable to verify the selected project." },
      { status: 500 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { error: "Project not found in your account." },
      { status: 404 }
    );
  }

  try {
    const audit = await crawlWebsite(project.website_url);

    const { data: savedAudit, error: saveError } = await supabase
      .from("audit_runs")
      .insert({
        user_id: user.id,
        project_id: project.id,
        status: "completed",
        pages_scanned: audit.pagesScanned,
        results: audit,
      })
      .select("id, project_id, status, pages_scanned, results, created_at")
      .single();

    if (saveError) {
      console.error("Save audit failed:", saveError.message);

      return NextResponse.json(
        {
          error:
            "The crawl finished, but its report could not be saved. Check the audit_runs table and its permissions.",
          audit,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project,
      audit: savedAudit,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The audit could not be completed.";

    console.error("SEO audit failed:", message);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
