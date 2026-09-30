import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { fail, ok, withAdmin, errorMessage } from "@/lib/api";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "OPERATOR"]),
  password: z.string().min(6).optional().or(z.literal("")),
});

export async function PUT(req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const { name, email, role, password } = parsed.data;

      const duplicate = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (duplicate) return fail("A user with this email already exists");

      if (session.userId === id && role !== "ADMIN") {
        return fail("You cannot remove your own admin role");
      }

      const data: {
        name: string;
        email: string;
        role: "ADMIN" | "OPERATOR";
        passwordHash?: string;
      } = { name, email, role };
      if (password) data.passwordHash = await hashPassword(password);

      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      return ok(user);
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAdmin(async (session) => {
    try {
      const { id } = await params;
      if (session.userId === id) {
        return fail("You cannot delete your own account");
      }
      await prisma.user.delete({ where: { id } });
      return ok({ ok: true });
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}