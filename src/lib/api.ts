import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (session: SessionPayload) => Promise<Response>
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("Unauthorized", 401);
  return handler(session);
}

export async function withAdmin(
  handler: (session: SessionPayload) => Promise<Response>
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "ADMIN") return fail("Forbidden", 403);
  return handler(session);
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Unexpected error";
}