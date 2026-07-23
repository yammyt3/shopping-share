const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error("Supabase keep-alive environment variables are missing.");
    return Response.json(
      { ok: false, error: "Server configuration error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const keepAliveUrl = new URL("/rest/v1/keep_alive", supabaseUrl);
    keepAliveUrl.searchParams.set("select", "id");
    keepAliveUrl.searchParams.set("limit", "1");

    const response = await fetch(keepAliveUrl, {
      headers: {
        Accept: "application/json",
        apikey: supabasePublishableKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(
        `Supabase keep-alive request failed with status ${response.status}.`,
      );
      return Response.json(
        { ok: false, error: "Supabase request failed" },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    const rows: unknown = await response.json();

    if (!Array.isArray(rows) || rows.length !== 1) {
      console.error("Supabase keep-alive row was not returned.");
      return Response.json(
        { ok: false, error: "Keep-alive row not found" },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Supabase keep-alive request could not be completed.", error);
    return Response.json(
      { ok: false, error: "Supabase request failed" },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
