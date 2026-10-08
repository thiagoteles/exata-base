import { auth, clerkClient } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import type { ClerkProfile } from "@/lib/accounts/clerk-sync";
import type { ClerkEvent } from "@/lib/accounts/clerk-webhook";
import type { AuthAdapter, SessionIdentity } from "../types";

/*
 * Clerk mode: users, sessions and social sign-in live in Clerk. The app keeps its own row per
 * user, keyed by clerkId, written by the webhook or, when sign-in arrives first, by ensureUser.
 */

type ClerkUserData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: {
    id: string;
    email_address: string;
    verification?: { status?: string } | null;
  }[];
};

function profileFrom(user: ClerkUserData): ClerkProfile | null {
  const primary = user.email_addresses?.find(
    (address) => address.id === user.primary_email_address_id,
  );
  if (primary === undefined || primary.verification?.status !== "verified") {
    return null;
  }
  return {
    clerkId: user.id,
    email: primary.email_address,
    name: [user.first_name, user.last_name].filter(Boolean).join(" "),
    image: user.image_url ?? null,
  };
}

export async function readClerkWebhook(
  request: NextRequest,
  signingSecret: string,
): Promise<ClerkEvent> {
  const event = await verifyWebhook(request, { signingSecret });
  const id = request.headers.get("svix-id") ?? "";
  if (event.type === "user.created" || event.type === "user.updated") {
    const profile = profileFrom(event.data as ClerkUserData);
    return profile === null ? { type: "ignored", id } : { type: event.type, id, profile };
  }
  if (event.type === "user.deleted" && typeof event.data.id === "string") {
    return { type: "user.deleted", id, clerkId: event.data.id };
  }
  return { type: "ignored", id };
}

export function clerkAdapter(upsert: (profile: ClerkProfile) => Promise<unknown>): AuthAdapter {
  return {
    async identity(): Promise<SessionIdentity | null> {
      const { userId } = await auth();
      return userId === null ? null : { kind: "clerk", clerkId: userId };
    },
    async ensureUser(identity) {
      if (identity.kind !== "clerk") {
        return;
      }
      const client = await clerkClient();
      const user = await client.users.getUser(identity.clerkId);
      const primary = user.primaryEmailAddress;
      if (primary === null || primary.verification?.status !== "verified") {
        return;
      }
      await upsert({
        clerkId: user.id,
        email: primary.emailAddress,
        name: user.fullName ?? "",
        image: user.imageUrl,
      });
    },
    async deleteProviderUser(clerkId) {
      const client = await clerkClient();
      await client.users.deleteUser(clerkId);
    },
    // Clerk serves its own sign-in; the app's auth API exists only in local mode.
    handleRequest: () => Promise.resolve(new Response(null, { status: 404 })),
  };
}
