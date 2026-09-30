"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import type { FuelLogDto, GeneratorDto } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import {
  formatNaira,
  formatNumber,
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  type FuelTypeValue,
} from "@/lib/utils";

export default function ReportsPage() {
  const [generatorId, setGeneratorId] = useState("");
  const [fuelType, setFuelType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (generatorId) p.set("generatorId", generatorId);
    if (fuelType !== "ALL") p.set("fuelType", fuelType);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [generatorId, fuelType, from, to]);

  const { data: logsData, loading } = useApi<FuelLogDto[]>(
    `/api/logs?${queryString}`
  );
  const { data: generatorsData } = useApi<GeneratorDto[]>("/api/generators");

  const logs = useMemo(() => logsData ?? [], [logsData]);
  const generators = useMemo(() => generatorsData ?? [], [generatorsData]);

  const byGenerator = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        logs: number;
        liters: number;
        cost: number;
        hours: number;
        consumptionSum: number;
        consumptionCount: number;
      }
    >();
    for (const l of logs) {
      const code = l.generator?.code ?? "—";
      const e =
        map.get(code) ??
        {
          code,
          logs: 0,
          liters: 0,
          cost: 0,
          hours: 0,
          consumptionSum: 0,
          consumptionCount: 0,
        };
      e.logs += 1;
      e.liters += l.liters;
      e.cost += l.cost;
      if (l.hoursWorked !== null) e.hours += l.hoursWorked;
      if (l.consumptionPerHour !== null) {
        e.consumptionSum += l.consumptionPerHour;
        e.consumptionCount += 1;
      }
      map.set(code, e);
    }
    return Array.from(map.values())
      .map((e) => ({
        code: e.code,
        logs: e.logs,
        liters: e.liters,
        cost: e.cost,
        hours: e.hours,
        avgConsumption:
          e.consumptionCount > 0 ? e.consumptionSum / e.consumptionCount : null,
      }))
      .sort((a, b) => b.liters - a.liters);
  }, [logs]);

  const byFuelType = useMemo(() => {
    const map = new Map<string, { liters: number; cost: number; count: number }>();
    for (const l of logs) {
      const e = map.get(l.fuelType) ?? { liters: 0, cost: 0, count: 0 };
      e.liters += l.liters;
      e.cost += l.cost;
      e.count += 1;
      map.set(l.fuelType, e);
    }
    return map;
  }, [logs]);

  const total = useMemo(
    () => ({
      liters: logs.reduce((s, l) => s + l.liters, 0),
      cost: logs.reduce((s, l) => s + l.cost, 0),
      hours: logs.reduce((s, l) => s + (l.hoursWorked ?? 0), 0),
    }),
    [logs]
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Summaries by generator and fuel type with CSV export."
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <a href={`/api/export?${queryString}`} download>
              <Button>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Generator">
            <Select
              value={generatorId}
              onChange={(e) => setGeneratorId(e.target.value)}
            >
              <option value="">All generators</option>
              {generators.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fuel Type">
            <Select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              <option value="ALL">All types</option>
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FUEL_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Fuel" value={`${formatNumber(total.liters)} L`} />
        <SummaryCard label="Total Cost" value={formatNaira(total.cost)} />
        <SummaryCard label="Total Hours Worked" value={formatNumber(total.hours)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Summary by Generator</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Generator</th>
                  <th className="px-5 py-3">Logs</th>
                  <th className="px-5 py-3">Liters</th>
                  <th className="px-5 py-3">Cost</th>
                  <th className="px-5 py-3">Hours</th>
                  <th className="px-5 py-3">Avg L/h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : byGenerator.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No data for the selected filters.
                    </td>
                  </tr>
                ) : (
                  byGenerator.map((g) => (
                    <tr key={g.code}>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {g.code}
                      </td>
                      <td className="px-5 py-3">{g.logs}</td>
                      <td className="px-5 py-3">{formatNumber(g.liters)}</td>
                      <td className="px-5 py-3">{formatNaira(g.cost)}</td>
                      <td className="px-5 py-3">{formatNumber(g.hours)}</td>
                      <td className="px-5 py-3">
                        {g.avgConsumption !== null
                          ? formatNumber(g.avgConsumption, 3)
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary by Fuel Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {FUEL_TYPES.map((t) => {
              const e = byFuelType.get(t);
              return (
                <div key={t} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {FUEL_TYPE_LABELS[t as FuelTypeValue]}
                    </p>
                    <p className="text-xs text-slate-500">{e?.count ?? 0} logs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800">
                      {formatNumber(e?.liters ?? 0)} L
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatNaira(e?.cost ?? 0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}