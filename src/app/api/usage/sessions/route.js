import { NextResponse } from "next/server";
import { listSessions, getSessionBreakdown, MAX_SESSION_ID_LENGTH } from "@/lib/usage/sessionUsage";

function isValidDate(value) {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * GET /api/usage/sessions
 *   ?sessionId=<id>                                   → per-model breakdown of one session
 *   ?page&pageSize(1-100)&startDate&endDate           → paginated session list + totals
 * Aggregates only — no prompt/response content. Auth via dashboardGuard (not a public path).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("sessionId");
    if (sessionId !== null) {
      if (!sessionId || sessionId.length > MAX_SESSION_ID_LENGTH) {
        return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
      }
      const breakdown = await getSessionBreakdown(sessionId);
      if (!breakdown) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      return NextResponse.json(breakdown);
    }

    const pageRaw = parseInt(searchParams.get("page"));
    const page = Number.isNaN(pageRaw) ? 1 : pageRaw;
    const pageSizeRaw = parseInt(searchParams.get("pageSize"));
    const pageSize = Number.isNaN(pageSizeRaw) ? 20 : pageSizeRaw;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "PageSize must be between 1 and 100" }, { status: 400 });
    }
    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const result = await listSessions({
      page,
      pageSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Failed to get session usage:", error);
    return NextResponse.json({ error: "Failed to fetch session usage" }, { status: 500 });
  }
}
