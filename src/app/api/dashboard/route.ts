import { prisma } from "@/lib/prisma";
import { fail, ok, withAuth, errorMessage } from "@/lib/api";

export async function GET() {
  return withAuth(async () => {
    try {
      const [generatorCount, logs] = await Promise.all([
        prisma.generator.count(),
        prisma.fuelLog.findMany({
          orderBy: [{ date: "asc" }, { time: "asc" }],
          include: { generator: { select: { id: true, code: true } } },
        }),
      ]);

      const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
      const totalCost = logs.reduce((s, l) => s + l.cost, 0);

      const consumptionValues = logs
        .map((l) => l.consumptionPerHour)
        .filter((v): v is number => v !== null && Number.isFinite(v));
      const avgConsumption =
        consumptionValues.length > 0
          ? consumptionValues.reduce((s, v) => s + v, 0) /
            consumptionValues.length
          : null;

      // Monthly totals for the chart (last 12 months present in data).
      const monthly = new Map<
        string,
        { liters: number; cost: number; consumptionSum: number; consumptionCount: number }
      >();
      for (const l of logs) {
        const key = l.date.toISOString().slice(0, 7);
        const entry =
          monthly.get(key) ??
          { liters: 0, cost: 0, consumptionSum: 0, consumptionCount: 0 };
        entry.liters += l.liters;
        entry.cost += l.cost;
        if (l.consumptionPerHour !== null) {
          entry.consumptionSum += l.consumptionPerHour;
          entry.consumptionCount += 1;
        }
        monthly.set(key, entry);
      }
      const monthlySeries = Array.from(monthly.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, v]) => ({
          month,
          liters: Number(v.liters.toFixed(2)),
          cost: Number(v.cost.toFixed(2)),
          avgConsumption:
            v.consumptionCount > 0
              ? Number((v.consumptionSum / v.consumptionCount).toFixed(3))
              : 0,
        }));

      // Per-generator summary.
      const perGenerator = new Map<
        string,
        {
          code: string;
          liters: number;
          cost: number;
          consumptionSum: number;
          consumptionCount: number;
        }
      >();
      for (const l of logs) {
        const entry =
          perGenerator.get(l.generatorId) ??
          {
            code: l.generator.code,
            liters: 0,
            cost: 0,
            consumptionSum: 0,
            consumptionCount: 0,
          };
        entry.liters += l.liters;
        entry.cost += l.cost;
        if (l.consumptionPerHour !== null) {
          entry.consumptionSum += l.consumptionPerHour;
          entry.consumptionCount += 1;
        }
        perGenerator.set(l.generatorId, entry);
      }
      const generatorSummary = Array.from(perGenerator.entries())
        .map(([id, v]) => ({
          generatorId: id,
          code: v.code,
          liters: Number(v.liters.toFixed(2)),
          cost: Number(v.cost.toFixed(2)),
          avgConsumption:
            v.consumptionCount > 0
              ? Number((v.consumptionSum / v.consumptionCount).toFixed(3))
              : null,
        }))
        .sort((a, b) => b.liters - a.liters);

      const recentLogs = [...logs]
        .sort(
          (a, b) =>
            b.date.getTime() - a.date.getTime() ||
            b.createdAt.getTime() - a.createdAt.getTime()
        )
        .slice(0, 8)
        .map((l) => ({
          id: l.id,
          generatorCode: l.generator.code,
          date: l.date.toISOString().slice(0, 10),
          time: l.time,
          liters: l.liters,
          fuelType: l.fuelType,
          isTankFull: l.isTankFull,
          consumptionPerHour: l.consumptionPerHour,
        }));

      return ok({
        kpis: {
          generatorCount,
          logCount: logs.length,
          totalLiters: Number(totalLiters.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          avgConsumption:
            avgConsumption !== null
              ? Number(avgConsumption.toFixed(3))
              : null,
        },
        monthlySeries,
        generatorSummary,
        recentLogs,
      });
    } catch (e) {
      return fail(errorMessage(e), 500);
    }
  });
}