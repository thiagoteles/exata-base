import { handleAuthRequest } from "@/lib/ports/auth";

// The local auth API (sign-up, sign-in, e-mail confirmation, password reset). 404 in Clerk mode.
export const GET = (request: Request) => handleAuthRequest(request);
export const POST = (request: Request) => handleAuthRequest(request);
