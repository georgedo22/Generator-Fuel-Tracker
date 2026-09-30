"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LogFormModal } from "@/components/logs/log-form-modal";
import { apiSend, type FuelLogDto, type GeneratorDto } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import {
  formatNaira,
  formatNumber,
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  type FuelTypeValue,
} from "@/lib/utils";

type Filters = {
  generatorId: string;
  fuelType: string;
  tank: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  generatorId: "",
  fuelType: "ALL",
  tank: "ALL",
  from: "",
  to: "",
};

export default function LogsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuelLogDto | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.generatorId) p.set("generatorId", filters.generatorId);
    if (filters.fuelType !== "ALL") p.set("fuelType", filters.fuelType);
    if (filters.tank !== "ALL") p.set("tank", filters.tank);
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    return p.toString();
  }, [filters]);

  const {
    data: logsData,
    loading,
    error,
    reload,
  } = useApi<FuelLogDto[]>(`/api/logs?${queryString}`);
  const { data: generatorsData } = useApi<GeneratorDto[]>("/api/generators");

  const logs = logsData ?? [];
  const generators = generatorsData ?? [];

  async function load() {
    reload();
  }

  async function remove(log: FuelLogDto) {
    if (!confirm("Delete this fuel log? Consumption will be recalculated.")) return;
    try {
      await apiSend(`/api/logs/${log.id}`, "DELETE");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);

  return (
    <div>
      <PageHeader
        title="Fuel Logs"
        description="Record fuel refills and monitor calculated consumption."
        actions={
          <>
            <a href={`/api/export?${queryString}`} download>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </a>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Fuel Log
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Generator">
            <Select
              value={filters.generatorId}
              onChange={(e) =>
                setFilters({ ...filters, generatorId: e.target.value })
              }
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
            <Select
              value={filters.fuelType}
              onChange={(e) =>
                setFilters({ ...filters, fuelType: e.target.value })
              }
            >
              <option value="ALL">All types</option>
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FUEL_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tank">
            <Select
              value={filters.tank}
              onChange={(e) => setFilters({ ...filters, tank: e.target.value })}
            >
              <option value="ALL">All</option>
              <option value="FULL">Full</option>
              <option value="EMPTY">Not full</option>
            </Select>
          </Field>
          <Field label="From">
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </Field>
          <Field label="To">
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
              <Button
                variant="outline"
                size="icon"
                title="Clear filters"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Generator</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Hour Rdg.</th>
                <th className="px-4 py-3">Liters</th>
                <th className="px-4 py-3">₦/L</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Tank</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">L/h</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    No fuel logs found.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {l.generator?.code}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.date.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.time}</td>
                    <td className="px-4 py-3">{formatNumber(l.hourReading)}</td>
                    <td className="px-4 py-3">{formatNumber(l.liters)}</td>
                    <td className="px-4 py-3">{formatNumber(l.pricePerLiter)}</td>
                    <td className="px-4 py-3">
                      {FUEL_TYPE_LABELS[l.fuelType as FuelTypeValue]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={l.isTankFull ? "green" : "slate"}>
                        {l.isTankFull ? "Full" : "Not full"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {l.hoursWorked !== null ? formatNumber(l.hoursWorked) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-700">
                      {l.consumptionPerHour !== null
                        ? formatNumber(l.consumptionPerHour, 3)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{formatNaira(l.cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(l);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => remove(l)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {logs.length > 0 ? (
              <tfoot className="bg-slate-50 font-medium">
                <tr>
                  <td className="px-4 py-3" colSpan={4}>
                    Total ({logs.length} logs)
                  </td>
                  <td className="px-4 py-3">{formatNumber(totalLiters)}</td>
                  <td className="px-4 py-3" colSpan={5} />
                  <td className="px-4 py-3">{formatNaira(totalCost)}</td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </CardContent>
      </Card>

      <LogFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        generators={generators}
        editing={editing}
        defaultGeneratorId={filters.generatorId || undefined}
      />
    </div>
  );
}