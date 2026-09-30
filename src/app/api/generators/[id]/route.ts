import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatorSchema } from "@/lib/validators";
import { fail, ok, withAuth, errorMessage } from "@/lib/api";
import { recomputeGeneratorConsumption } from "@/lib/consumption";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    const { id } = await params;
    const generator = await prisma.generator.findUnique({
      where: { id },
      include: {
        fuelLogs: { orderBy: [{ hourReading: "asc" }] },
      },
    });
    if (!generator) return fail("Generator not found", 404);
    return ok(generator);
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = generatorSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const { code, location, imageUrl, notes } = parsed.data;

      const duplicate = await prisma.generator.findFirst({
        where: { code, NOT: { id } },
      });
      if (duplicate) return fail("A generator with this number already exists");

      const generator = await prisma.generator.update({
        where: { id },
        data: {
          code,
          location,
          imageUrl: imageUrl || null,
          notes: notes || null,
        },
      });
      return ok(generator);
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      await prisma.generator.delete({ where: { id } });
      return ok({ ok: true });
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      await recomputeGeneratorConsumption(id);
      return ok({ ok: true });
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}