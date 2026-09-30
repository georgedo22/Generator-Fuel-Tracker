import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fuelLogSchema } from "@/lib/validators";
import { fail, ok, withAuth, errorMessage } from "@/lib/api";
import { recomputeGeneratorConsumption } from "@/lib/consumption";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      const body = await req.json();
      const parsed = fuelLogSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const d = parsed.data;

      const existing = await prisma.fuelLog.findUnique({ where: { id } });
      if (!existing) return fail("Fuel log not found", 404);

      const log = await prisma.fuelLog.update({
        where: { id },
        data: {
          generatorId: d.generatorId,
          date: new Date(d.date),
          time: d.time,
          hourReading: d.hourReading,
          liters: d.liters,
          pricePerLiter: d.pricePerLiter,
          fuelType: d.fuelType,
          isTankFull: d.isTankFull,
          cost: d.liters * d.pricePerLiter,
        },
      });

      await recomputeGeneratorConsumption(d.generatorId);
      if (existing.generatorId !== d.generatorId) {
        await recomputeGeneratorConsumption(existing.generatorId);
      }

      const saved = await prisma.fuelLog.findUnique({ where: { id: log.id } });
      return ok(saved);
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      const existing = await prisma.fuelLog.findUnique({ where: { id } });
      if (!existing) return fail("Fuel log not found", 404);

      await prisma.fuelLog.delete({ where: { id } });
      await recomputeGeneratorConsumption(existing.generatorId);
      return ok({ ok: true });
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}