import { NextRequest, NextResponse } from "next/server";

const FLASK_BACKEND_URL =
  process.env.FLASK_BACKEND_URL || "http://localhost:5001";
const TITLE_TIMEOUT_MS = Number(process.env.TITLE_TIMEOUT_MS || 8000);

function computeFallbackTitle(firstMessage: string) {
  const firstLine = firstMessage.split("\n")[0] ?? "";
  const title = firstLine.substring(0, 50);
  return title.length < firstLine.length ? `${title}...` : title;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as any));
  const firstMessage: string = (body?.firstMessage ?? "").toString();

  if (!firstMessage.trim()) {
    return NextResponse.json(
      { error: "Missing required field: firstMessage" },
      { status: 400 }
    );
  }

  const fallbackTitle = computeFallbackTitle(firstMessage);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TITLE_TIMEOUT_MS);

    const resp = await fetch(`${FLASK_BACKEND_URL}/api/title`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      body: JSON.stringify({ firstMessage }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!resp.ok) {
      return NextResponse.json({ title: fallbackTitle });
    }

    const data = await resp.json().catch(() => ({} as any));
    const title = (data?.title ?? "").toString().trim();

    return NextResponse.json({ title: title || fallbackTitle });
  } catch (err) {
    console.error("Title proxy error:", err);
    return NextResponse.json({ title: fallbackTitle });
  }
}
