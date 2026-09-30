import { prisma } from "@/lib/prisma";

export type ComputedLog = {
  id: string;
  hoursWorked: number | null;
  consumptionPerHour: number | null;
  cost: number;
};

/**
 * Full-to-full fuel consumption algorithm.
 *
 * Logs are ordered by hour reading. A log where the tank is NOT full never
 * yields a consumption figure on its own. When a FULL log is reached, the
 * consumption is computed between it and the previous FULL log:
 *
 *   hoursWorked        = current.hourReading - previousFull.hourReading
 *   totalFuel          = current.liters + sum(liters of all non-full logs in between)
 *   consumptionPerHour = totalFuel / hoursWorked   (only when hoursWorked > 0)
 *
 * If there is no previous full log, the series has not started yet and no
 * consumption is computed.
 */
export function computeConsumption<
  T extends {
    id: string;
    hourReading: number;
    liters: number;
    pricePerLiter: number;
    isTankFull: boolean;
  }
>(logs: T[]): ComputedLog[] {
  const sorted = [...logs].sort((a, b) => {
    if (a.hourReading !== b.hourReading) return a.hourReading - b.hourReading;
    return a.id.localeCompare(b.id);
  });

  let previousFullReading: number | null = null;
  let pendingNonFullLiters = 0;
  const results: ComputedLog[] = [];

  for (const log of sorted) {
    const cost = log.liters * log.pricePerLiter;

    if (log.isTankFull) {
      let hoursWorked: number | null = null;
      let consumptionPerHour: number | null = null;

      if (previousFullReading !== null) {
        hoursWorked = log.hourReading - previousFullReading;
        if (hoursWorked > 0) {
          const totalFuel = log.liters + pendingNonFullLiters;
          consumptionPerHour = totalFuel / hoursWorked;
        } else {
          hoursWorked = hoursWorked === 0 ? 0 : hoursWorked;
          consumptionPerHour = null;
        }
      }

      results.push({ id: log.id, hoursWorked, consumptionPerHour, cost });
      previousFullReading = log.hourReading;
      pendingNonFullLiters = 0;
    } else {
      results.push({ id: log.id, hoursWorked: null, consumptionPerHour: null, cost });
      pendingNonFullLiters += log.liters;
    }
  }

  return results;
}

/** Recompute and persist derived fields for every log of a generator. */
export async function recomputeGeneratorConsumption(
  generatorId: string
): Promise<void> {
  const logs = await prisma.fuelLog.findMany({
    where: { generatorId },
    select: {
      id: true,
      hourReading: true,
      liters: true,
      pricePerLiter: true,
      isTankFull: true,
    },
  });

  const computed = computeConsumption(logs);

  await prisma.$transaction(
    computed.map((c) =>
      prisma.fuelLog.update({
        where: { id: c.id },
        data: {
          hoursWorked: c.hoursWorked,
          consumptionPerHour: c.consumptionPerHour,
          cost: c.cost,
        },
      })
    )
  );
}

/** Recompute every generator (used after bulk CSV import). */
export async function recomputeAllGenerators(): Promise<void> {
  const generators = await prisma.generator.findMany({ select: { id: true } });
  for (const g of generators) {
    await recomputeGeneratorConsumption(g.id);
  }
}