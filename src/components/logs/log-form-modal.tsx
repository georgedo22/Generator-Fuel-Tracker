"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiSend, type FuelLogDto, type GeneratorDto } from "@/lib/types";
import { FUEL_TYPES, FUEL_TYPE_LABELS, type FuelTypeValue } from "@/lib/utils";

type FormState = {
  generatorId: string;
  date: string;
  time: string;
  hourReading: string;
  liters: string;
  pricePerLiter: string;
  fuelType: FuelTypeValue;
  isTankFull: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

function initialState(
  editing: FuelLogDto | null,
  defaultGeneratorId: string | undefined,
  generators: GeneratorDto[]
): FormState {
  if (editing) {
    return {
      generatorId: editing.generatorId,
      date: editing.date.slice(0, 10),
      time: editing.time,
      hourReading: String(editing.hourReading),
      liters: String(editing.liters),
      pricePerLiter: String(editing.pricePerLiter),
      fuelType: editing.fuelType,
      isTankFull: editing.isTankFull,
    };
  }
  return {
    generatorId: defaultGeneratorId ?? generators[0]?.id ?? "",
    date: today(),
    time: nowTime(),
    hourReading: "",
    liters: "",
    pricePerLiter: "",
    fuelType: "DIESEL",
    isTankFull: false,
  };
}

/**
 * Outer wrapper: unmounts the form when closed so each open starts fresh,
 * avoiding a setState-in-effect reset.
 */
export function LogFormModal(props: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  generators: GeneratorDto[];
  editing: FuelLogDto | null;
  defaultGeneratorId?: string;
}) {
  if (!props.open) return null;
  return <LogForm key={props.editing?.id ?? "new"} {...props} />;
}

function LogForm({
  open,
  onClose,
  onSaved,
  generators,
  editing,
  defaultGeneratorId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  generators: GeneratorDto[];
  editing: FuelLogDto | null;
  defaultGeneratorId?: string;
}) {
  const [form, setForm] = useState<FormState>(() =>
    initialState(editing, defaultGeneratorId, generators)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost =
    (Number(form.liters) || 0) * (Number(form.pricePerLiter) || 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        generatorId: form.generatorId,
        date: form.date,
        time: form.time,
        hourReading: Number(form.hourReading),
        liters: Number(form.liters),
        pricePerLiter: Number(form.pricePerLiter),
        fuelType: form.fuelType,
        isTankFull: form.isTankFull,
      };
      if (editing) {
        await apiSend(`/api/logs/${editing.id}`, "PUT", payload);
      } else {
        await apiSend("/api/logs", "POST", payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Fuel Log" : "Add Fuel Log"}
      width="max-w-xl"
    >
      <form onSubmit={save} className="space-y-4">
        <Field label="Generator">
          <Select
            required
            value={form.generatorId}
            onChange={(e) => setForm({ ...form, generatorId: e.target.value })}
          >
            <option value="">Select a generator</option>
            {generators.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} — {g.location}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Time">
            <Input
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hour Reading (meter)" hint="Machine hour meter value">
            <Input
              type="number"
              step="any"
              min="0"
              required
              value={form.hourReading}
              onChange={(e) =>
                setForm({ ...form, hourReading: e.target.value })
              }
              placeholder="e.g. 1250.5"
            />
          </Field>
          <Field label="Fuel Type">
            <Select
              value={form.fuelType}
              onChange={(e) =>
                setForm({ ...form, fuelType: e.target.value as FuelTypeValue })
              }
            >
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FUEL_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Liters">
            <Input
              type="number"
              step="any"
              min="0"
              required
              value={form.liters}
              onChange={(e) => setForm({ ...form, liters: e.target.value })}
              placeholder="e.g. 40"
            />
          </Field>
          <Field label="Price per Liter (₦)">
            <Input
              type="number"
              step="any"
              min="0"
              required
              value={form.pricePerLiter}
              onChange={(e) =>
                setForm({ ...form, pricePerLiter: e.target.value })
              }
              placeholder="e.g. 850"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={form.isTankFull}
              onChange={(e) =>
                setForm({ ...form, isTankFull: e.target.checked })
              }
            />
            <span className="text-sm font-medium text-slate-700">
              Tank was filled to full
            </span>
          </label>
          <span className="text-sm text-slate-600">
            Cost: <strong>{totalCost.toFixed(2)}</strong>
          </span>
        </div>

        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Consumption per hour is only calculated when the tank is filled to
          full, based on the distance from the previous full-tank log.
        </p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add log"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}