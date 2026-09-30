"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { apiSend, type FuelLogDto, type GeneratorDto } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import {
  formatNaira,
  formatNumber,
  FUEL_TYPE_LABELS,
  type FuelTypeValue,
} from "@/lib/utils";

type GeneratorDetail = GeneratorDto & { fuelLogs: FuelLogDto[] };

export default function GeneratorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: generator, error, reload } = useApi<GeneratorDetail>(
    `/api/generators/${params.id}`
  );

  async function recompute() {
    await apiSend(`/api/generators/${params.id}`, "PATCH");
    reload();
  }

  if (error)
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    );
  if (!generator) return <p className="text-sm text-slate-500">Loading...</p>;

  const logs = generator.fuelLogs;
  const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const consumptionValues = logs
    .map((l) => l.consumptionPerHour)
    .filter((v): v is number => v !== null);
  const avgConsumption =
    consumptionValues.length > 0
      ? consumptionValues.reduce((s, v) => s + v, 0) / consumptionValues.length
      : null;

  const chartData = logs
    .filter((l) => l.consumptionPerHour !== null)
    .map((l) => ({
      label: `${l.date.slice(5)} ${l.time}`,
      consumption: Number(l.consumptionPerHour!.toFixed(3)),
    }));

  return (
    <div>
      <button
        onClick={() => router.push("/generators")}
        className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to generators
      </button>

      <PageHeader
        title={generator.code}
        description={generator.location}
        actions={
          <Button variant="outline" onClick={recompute}>
            <RefreshCw className="h-4 w-4" />
            Recalculate
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="h-56 w-full overflow-hidden rounded-t-xl bg-slate-100">
            {generator.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={generator.imageUrl}
                alt={generator.code}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No image
              </div>
            )}
          </div>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">
                Location
              </p>
              <p className="flex items-center gap-1 text-sm text-slate-800">
                <MapPin className="h-4 w-4 text-slate-400" />
                {generator.location}
              </p>
            </div>
            {generator.notes ? (
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Notes
                </p>
                <p className="text-sm text-slate-700">{generator.notes}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {logs.length}
                </p>
                <p className="text-xs text-slate-500">Logs</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {formatNumber(totalLiters)}
                </p>
                <p className="text-xs text-slate-500">Liters</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {avgConsumption !== null
                    ? formatNumber(avgConsumption, 2)
                    : "—"}
                </p>
                <p className="text-xs text-slate-500">Avg L/h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fuel Consumption Over Time (L/h)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Not enough data yet (needs two full-tank logs)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="consumption"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Fuel Logs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Hour Reading</th>
                <th className="px-5 py-3">Liters</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Tank</th>
                <th className="px-5 py-3">Hours Worked</th>
                <th className="px-5 py-3">L/h</th>
                <th className="px-5 py-3">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    No fuel logs for this generator yet.
                  </td>
                </tr>
              ) : (
                [...logs].reverse().map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3 text-slate-700">
                      {l.date.slice(0, 10)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{l.time}</td>
                    <td className="px-5 py-3">{formatNumber(l.hourReading)}</td>
                    <td className="px-5 py-3">{formatNumber(l.liters)}</td>
                    <td className="px-5 py-3">
                      {FUEL_TYPE_LABELS[l.fuelType as FuelTypeValue]}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={l.isTankFull ? "green" : "slate"}>
                        {l.isTankFull ? "Full" : "Not full"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {l.hoursWorked !== null ? formatNumber(l.hoursWorked) : "—"}
                    </td>
                    <td className="px-5 py-3 font-medium text-blue-700">
                      {l.consumptionPerHour !== null
                        ? formatNumber(l.consumptionPerHour, 3)
                        : "—"}
                    </td>
                    <td className="px-5 py-3">{formatNaira(l.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {logs.length > 0 ? (
              <tfoot className="bg-slate-50 text-sm font-medium">
                <tr>
                  <td className="px-5 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-5 py-3">{formatNumber(totalLiters)}</td>
                  <td className="px-5 py-3" colSpan={4} />
                  <td className="px-5 py-3">{formatNaira(totalCost)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        Consumption is calculated between two full-tank records (full-to-full
        method). {""}
        <Link href="/logs" className="text-blue-600 hover:underline">
          Add a fuel log
        </Link>
      </p>
    </div>
  );
}