import type { NextRequest } from "next/server";

// Forwards /api/* to the backend on the VPS. The browser only ever sees this origin, so the
// session cookie is first-party. The shared secret proves to the backend that a request came
// through here.

const DROP_REQUEST = new Set([
  "connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade",
  "host", "content-length", "accept-encoding", "x-proxy-secret",
]);
// fetch() decompresses upstream bodies but keeps content-encoding, so both length and
// encoding must be dropped or the browser decodes twice. Set-Cookie is re-added one by one.
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"]);

async function forward(request: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const origin = process.env.API_ORIGIN;
  const secret = process.env.PROXY_SECRET;
  if (!origin || !secret) {
    return Response.json({ error: "api not configured" }, { status: 503 });
  }

  const { path } = await ctx.params;
  const url = new URL(path.map(encodeURIComponent).join("/"), origin.endsWith("/") ? origin : `${origin}/`);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_REQUEST.has(key)) headers.set(key, value);
  });
  headers.set("x-proxy-secret", secret);
  headers.set("accept-encoding", "identity");
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      // required by Node's fetch when streaming a request body
      duplex: "half",
    } as RequestInit);
  } catch {
    return Response.json({ error: "api unreachable" }, { status: 502 });
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key)) out.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
