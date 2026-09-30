import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatorSchema } from "@/lib/validators";
import { fail, ok, withAuth, errorMessage } from "@/lib/api";

export async function GET() {
  return withAuth(async () => {
    const generators = await prisma.generator.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { fuelLogs: true } },
      },
    });
    return ok(generators);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    try {
      const body = await req.json();
      const parsed = generatorSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const { code, location, imageUrl, notes } = parsed.data;

      const exists = await prisma.generator.findUnique({ where: { code } });
      if (exists) return fail("A generator with this number already exists");

      const generator = await prisma.generator.create({
        data: {
          code,
          location,
          imageUrl: imageUrl || null,
          notes: notes || null,
        },
      });
      return ok(generator, 201);
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}