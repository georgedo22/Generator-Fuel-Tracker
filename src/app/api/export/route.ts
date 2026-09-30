import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { LOG_CSV_HEADERS, toCsv } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

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
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { generator: { select: { code: true } } },
  });

  const rows = logs.map((log) => ({
    "Generator Code": log.generator.code,
    Date: log.date.toISOString().slice(0, 10),
    Time: log.time,
    "Hour Reading": log.hourReading,
    Liters: log.liters,
    "Price Per Liter": log.pricePerLiter,
    "Fuel Type": log.fuelType,
    "Tank Full": log.isTankFull ? "Yes" : "No",
    "Hours Worked": log.hoursWorked ?? "",
    "Consumption Per Hour": log.consumptionPerHour ?? "",
    "Total Cost": log.cost,
  }));

  const csv = toCsv(rows, LOG_CSV_HEADERS);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fuel-logs-${Date.now()}.csv"`,
    },
  });
}