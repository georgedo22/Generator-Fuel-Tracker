"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

type PreviewRow = {
  row: number;
  generatorCode: string;
  date: string;
  time: string;
  hourReading: number;
  liters: number;
  pricePerLiter: number;
  fuelType: string;
  isTankFull: boolean;
};

type PreviewResponse = {
  total: number;
  valid: number;
  errors: { row: number; message: string }[];
  preview: PreviewRow[];
};

const TEMPLATE_HEADERS = [
  "Generator Code",
  "Date",
  "Time",
  "Hour Reading",
  "Liters",
  "Price Per Liter",
  "Fuel Type",
  "Tank Full",
];

const TEMPLATE_SAMPLE = [
  ["GEN-001", "2026-01-05", "08:30", "1000", "0", "0", "DIESEL", "Yes"],
  ["GEN-001", "2026-01-06", "09:15", "1050", "20", "850", "DIESEL", "No"],
  ["GEN-001", "2026-01-07", "08:00", "1100", "30", "850", "DIESEL", "Yes"],
];

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    const lines = [TEMPLATE_HEADERS.join(",")];
    for (const row of TEMPLATE_SAMPLE) lines.push(row.join(","));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fuel-logs-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function send(mode: "preview" | "commit", selected: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", selected);
      form.append("mode", mode);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setPreview(data.errors ? { total: 0, valid: 0, errors: data.errors, preview: [] } : null);
        }
        throw new Error(data.error ?? "Import failed");
      }
      if (mode === "preview") {
        setPreview(data as PreviewResponse);
      } else {
        setResult(data as { imported: number });
        setPreview(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Import Fuel Logs (CSV)"
        description="Bulk import fuel records. Generators must exist before import."
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upload file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(null);
                setResult(null);
                setError(null);
              }}
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-blue-400"
            >
              <FileUp className="mb-2 h-6 w-6 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                {file ? file.name : "Click to choose a CSV file"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Columns: Generator Code, Date, Time, Hour Reading, Liters, Price
                Per Liter, Fuel Type, Tank Full
              </p>
            </div>

            <Button
              className="w-full"
              disabled={!file || busy}
              onClick={() => file && send("preview", file)}
            >
              {busy ? "Processing..." : "Validate & Preview"}
            </Button>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <span>
                  Imported {result.imported} records and recalculated
                  consumption.
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Validation Preview</CardTitle>
            {preview ? (
              <div className="flex items-center gap-2">
                <Badge tone="green">{preview.valid} valid</Badge>
                <Badge tone={preview.errors.length ? "red" : "slate"}>
                  {preview.errors.length} errors
                </Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!preview ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Choose a CSV file and click “Validate & Preview”.
              </p>
            ) : (
              <div className="space-y-4">
                {preview.errors.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      Fix these rows before importing:
                    </p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-600">
                      {preview.errors.map((e, i) => (
                        <li key={i}>
                          Row {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.preview.length > 0 ? (
                  <>
                    <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-left uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Row</th>
                            <th className="px-3 py-2">Generator</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Time</th>
                            <th className="px-3 py-2">Hour</th>
                            <th className="px-3 py-2">Liters</th>
                            <th className="px-3 py-2">₦/L</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Tank</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.preview.map((r) => (
                            <tr key={r.row}>
                              <td className="px-3 py-2 text-slate-400">{r.row}</td>
                              <td className="px-3 py-2 font-medium">
                                {r.generatorCode}
                              </td>
                              <td className="px-3 py-2">{r.date}</td>
                              <td className="px-3 py-2">{r.time}</td>
                              <td className="px-3 py-2">
                                {formatNumber(r.hourReading)}
                              </td>
                              <td className="px-3 py-2">
                                {formatNumber(r.liters)}
                              </td>
                              <td className="px-3 py-2">
                                {formatNumber(r.pricePerLiter)}
                              </td>
                              <td className="px-3 py-2">{r.fuelType}</td>
                              <td className="px-3 py-2">
                                {r.isTankFull ? "Full" : "Not full"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {preview.valid > preview.preview.length ? (
                      <p className="text-xs text-slate-500">
                        Showing the first {preview.preview.length} of{" "}
                        {preview.valid} valid rows.
                      </p>
                    ) : null}

                    <Button
                      disabled={busy || preview.errors.length > 0}
                      onClick={() => file && send("commit", file)}
                    >
                      {busy
                        ? "Importing..."
                        : `Import ${preview.valid} records`}
                    </Button>
                  </>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}