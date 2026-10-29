import { handleAuthRequest } from "@/lib/ports/auth";
import { timedRoute } from "@/lib/timed-route";

// Open to anyone: signing up and signing in come before any session; each step is rate limited by credential.
// The local auth API (sign-up, sign-in, e-mail confirmation, password reset). 404 in Clerk mode.
export const GET = timedRoute("/api/auth/[...all]", (request: Request) =>
  handleAuthRequest(request),
);
export const POST = timedRoute("/api/auth/[...all]", (request: Request) =>
  handleAuthRequest(request),
);
