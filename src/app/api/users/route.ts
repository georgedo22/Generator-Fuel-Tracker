import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { userSchema } from "@/lib/validators";
import { fail, ok, withAdmin, errorMessage } from "@/lib/api";

export async function GET() {
  return withAdmin(async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    return ok(users);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    try {
      const body = await req.json();
      const parsed = userSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const { name, email, password, role } = parsed.data;

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return fail("A user with this email already exists");

      const user = await prisma.user.create({
        data: { name, email, passwordHash: await hashPassword(password), role },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      return ok(user, 201);
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}