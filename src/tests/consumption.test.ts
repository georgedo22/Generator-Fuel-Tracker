import { describe, it, expect } from "vitest";
import { computeConsumption } from "@/lib/consumption";

type Log = {
  id: string;
  hourReading: number;
  liters: number;
  pricePerLiter: number;
  isTankFull: boolean;
};

function log(
  id: string,
  hourReading: number,
  liters: number,
  isTankFull: boolean,
  pricePerLiter = 100
): Log {
  return { id, hourReading, liters, isTankFull, pricePerLiter };
}

describe("computeConsumption (full-to-full)", () => {
  it("does not compute for non-full logs", () => {
    const result = computeConsumption([log("a", 100, 20, false)]);
    expect(result[0].consumptionPerHour).toBeNull();
    expect(result[0].hoursWorked).toBeNull();
  });

  it("does not compute the first full log (series start)", () => {
    const result = computeConsumption([log("a", 100, 40, true)]);
    expect(result[0].consumptionPerHour).toBeNull();
  });

  it("computes consumption between two consecutive full logs", () => {
    const result = computeConsumption([
      log("a", 1000, 0, true), // start reference
      log("b", 1100, 50, true), // 100h, 50L => 0.5 L/h
    ]);
    const b = result.find((r) => r.id === "b")!;
    expect(b.hoursWorked).toBe(100);
    expect(b.consumptionPerHour).toBeCloseTo(0.5, 6);
  });

  it("includes non-full liters in the following full log total", () => {
    const result = computeConsumption([
      log("a", 1000, 0, true),
      log("b", 1050, 20, false),
      log("c", 1100, 30, true), // (20 + 30) / 100 = 0.5
    ]);
    const b = result.find((r) => r.id === "b")!;
    const c = result.find((r) => r.id === "c")!;
    expect(b.consumptionPerHour).toBeNull();
    expect(c.hoursWorked).toBe(100);
    expect(c.consumptionPerHour).toBeCloseTo(0.5, 6);
  });

  it("ignores non-full logs before the first full log", () => {
    const result = computeConsumption([
      log("a", 900, 15, false), // ignored
      log("b", 1000, 0, true), // start
      log("c", 1050, 25, true), // 50h, 25L => 0.5
    ]);
    const c = result.find((r) => r.id === "c")!;
    expect(c.hoursWorked).toBe(50);
    expect(c.consumptionPerHour).toBeCloseTo(0.5, 6);
  });

  it("does not compute when hours worked is zero (no divide by zero)", () => {
    const result = computeConsumption([
      log("a", 1000, 0, true),
      log("b", 1000, 10, true),
    ]);
    const b = result.find((r) => r.id === "b")!;
    expect(b.hoursWorked).toBe(0);
    expect(b.consumptionPerHour).toBeNull();
  });

  it("always computes cost = liters * pricePerLiter", () => {
    const result = computeConsumption([log("a", 100, 30, false, 850)]);
    expect(result[0].cost).toBe(25500);
  });

  it("sorts unordered logs by hour reading", () => {
    const result = computeConsumption([
      log("c", 1100, 30, true),
      log("a", 1000, 0, true),
      log("b", 1050, 20, false),
    ]);
    const c = result.find((r) => r.id === "c")!;
    expect(c.hoursWorked).toBe(100);
    expect(c.consumptionPerHour).toBeCloseTo(0.5, 6);
  });
});