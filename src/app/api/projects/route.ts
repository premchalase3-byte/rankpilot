
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeWebsiteUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());

    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.hash = "";
    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, website_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List projects failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load projects." },
      { status: 500 }
    );
  }

  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("website_url" in body) ||
    typeof body.website_url !== "string"
  ) {
    return NextResponse.json(
      { error: "A valid website URL is required." },
      { status: 400 }
    );
  }

  const websiteUrl = normalizeWebsiteUrl(body.website_url);

  if (!websiteUrl || websiteUrl.length > 2048) {
    return NextResponse.json(
      { error: "Enter a valid HTTP or HTTPS website URL." },
      { status: 400 }
    );
  }

  const suppliedName =
    "name" in body && typeof body.name === "string"
      ? body.name.trim()
      : "";

  const name = (suppliedName || new URL(websiteUrl).hostname).slice(0, 100);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      website_url: websiteUrl,
    })
    .select("id, name, website_url, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This website is already in your projects." },
        { status: 409 }
      );
    }

    console.error("Create project failed:", error.message);

    return NextResponse.json(
      { error: "Unable to create the project." },
      { status: 500 }
    );
  }

  return NextResponse.json({ project: data }, { status: 201 });
}
