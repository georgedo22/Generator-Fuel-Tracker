import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fuelLogSchema } from "@/lib/validators";
import { fail, ok, withAuth, errorMessage } from "@/lib/api";
import { recomputeGeneratorConsumption } from "@/lib/consumption";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(req.url);
    const generatorId = searchParams.get("generatorId") ?? undefined;
    const fuelType = searchParams.get("fuelType") ?? undefined;
    const tank = searchParams.get("tank") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const where: Prisma.FuelLogWhereInput = {};
    if (generatorId) where.generatorId = generatorId;
    if (fuelType && fuelType !== "ALL")
      where.fuelType = fuelType as Prisma.EnumFuelTypeFilter["equals"];
    if (tank === "FULL") where.isTankFull = true;
    if (tank === "EMPTY") where.isTankFull = false;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
    }

    const logs = await prisma.fuelLog.findMany({
      where,
      orderBy: [{ date: "desc" }, { time: "desc" }, { createdAt: "desc" }],
      include: { generator: { select: { code: true, location: true } } },
    });
    return ok(logs);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    try {
      const body = await req.json();
      const parsed = fuelLogSchema.safeParse(body);
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      const d = parsed.data;

      const generator = await prisma.generator.findUnique({
        where: { id: d.generatorId },
      });
      if (!generator) return fail("Generator not found", 404);

      const log = await prisma.fuelLog.create({
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
      const saved = await prisma.fuelLog.findUnique({ where: { id: log.id } });
      return ok(saved, 201);
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}