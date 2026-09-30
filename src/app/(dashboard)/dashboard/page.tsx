"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Zap, Fuel, Banknote, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { apiGet, type DashboardData } from "@/lib/types";
import { formatNaira, formatNumber, FUEL_TYPE_LABELS, type FuelTypeValue } from "@/lib/utils";

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of generators, fuel usage and consumption."
      />

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!data ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Generators"
              value={String(data.kpis.generatorCount)}
              icon={Zap}
              tone="bg-blue-100 text-blue-600"
            />
            <Kpi
              label="Total Fuel (L)"
              value={formatNumber(data.kpis.totalLiters)}
              icon={Fuel}
              tone="bg-emerald-100 text-emerald-600"
            />
            <Kpi
              label="Total Cost"
              value={formatNaira(data.kpis.totalCost)}
              icon={Banknote}
              tone="bg-amber-100 text-amber-600"
            />
            <Kpi
              label="Avg Consumption (L/h)"
              value={
                data.kpis.avgConsumption !== null
                  ? formatNumber(data.kpis.avgConsumption, 3)
                  : "—"
              }
              icon={Gauge}
              tone="bg-purple-100 text-purple-600"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fuel Used per Month (Liters)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.monthlySeries.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlySeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="liters" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Consumption per Month (L/h)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.monthlySeries.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlySeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgConsumption"
                        name="L/h"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Consumption by Generator</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Generator</th>
                      <th className="px-5 py-3">Liters</th>
                      <th className="px-5 py-3">Cost</th>
                      <th className="px-5 py-3">Avg L/h</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.generatorSummary.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                          No data yet
                        </td>
                      </tr>
                    ) : (
                      data.generatorSummary.map((g) => (
                        <tr key={g.generatorId}>
                          <td className="px-5 py-3 font-medium text-slate-800">
                            {g.code}
                          </td>
                          <td className="px-5 py-3">{formatNumber(g.liters)}</td>
                          <td className="px-5 py-3">{formatNaira(g.cost)}</td>
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
                <CardTitle>Recent Fuel Logs</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Generator</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Liters</th>
                      <th className="px-5 py-3">Tank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                          No logs yet
                        </td>
                      </tr>
                    ) : (
                      data.recentLogs.map((l) => (
                        <tr key={l.id}>
                          <td className="px-5 py-3 font-medium text-slate-800">
                            {l.generatorCode}
                          </td>
                          <td className="px-5 py-3 text-slate-600">{l.date}</td>
                          <td className="px-5 py-3 text-slate-600">
                            {FUEL_TYPE_LABELS[l.fuelType as FuelTypeValue] ?? l.fuelType}
                          </td>
                          <td className="px-5 py-3">{formatNumber(l.liters)}</td>
                          <td className="px-5 py-3">
                            <Badge tone={l.isTankFull ? "green" : "slate"}>
                              {l.isTankFull ? "Full" : "Not full"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      No data to display yet
    </div>
  );
}