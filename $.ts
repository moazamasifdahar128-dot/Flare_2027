import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

async function pinSessionCookies(response: Response) {
  const lines = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (!lines.length) return;
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("set-cookie", lines);
}

async function handle(request: Request) {
  const response = await auth.handler(request);
  try {
    await pinSessionCookies(response);
  } catch {
    /* the handler response still carries its own Set-Cookie lines */
  }
  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
