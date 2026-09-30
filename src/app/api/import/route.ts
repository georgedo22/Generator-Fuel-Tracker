import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recomputeGeneratorConsumption } from "@/lib/consumption";
import {
  parseBool,
  parseCsv,
  parseDate,
  parseFuelType,
} from "@/lib/csv";

export const runtime = "nodejs";

type IncomingRow = Record<string, string>;

type RowError = { row: number; message: string };

type ParsedRow = {
  row: number;
  generatorCode: string;
  generatorId: string;
  date: Date;
  time: string;
  hourReading: number;
  liters: number;
  pricePerLiter: number;
  fuelType: "PETROL" | "DIESEL" | "KEROSENE";
  isTankFull: boolean;
};

const REQUIRED = [
  "Generator Code",
  "Date",
  "Time",
  "Hour Reading",
  "Liters",
  "Price Per Liter",
  "Fuel Type",
  "Tank Full",
];

function normalizeTime(value: string): string {
  const v = value.trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(v);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
      d.getUTCMinutes()
    ).padStart(2, "0")}`;
  }
  throw new Error(`Invalid time: ${value}`);
}

async function process(rows: IncomingRow[]) {
  const errors: RowError[] = [];
  const parsed: ParsedRow[] = [];

  const generators = await prisma.generator.findMany({
    select: { id: true, code: true },
  });
  const byCode = new Map(
    generators.map((g) => [g.code.trim().toLowerCase(), g.id])
  );

  rows.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1
    const nonEmpty = Object.values(raw).some((v) => (v ?? "").trim() !== "");
    if (!nonEmpty) return;

    for (const key of REQUIRED) {
      if (!(key in raw)) {
        errors.push({ row: rowNumber, message: `Missing column "${key}"` });
        return;
      }
    }

    try {
      const code = (raw["Generator Code"] ?? "").trim();
      if (!code) throw new Error("Missing generator code");
      const generatorId = byCode.get(code.toLowerCase());
      if (!generatorId)
        throw new Error(`Unknown generator code "${code}" (create it first)`);

      const date = parseDate(raw["Date"] ?? "");
      const time = normalizeTime(raw["Time"] ?? "");

      const hourReading = Number(raw["Hour Reading"]);
      const liters = Number(raw["Liters"]);
      const pricePerLiter = Number(raw["Price Per Liter"]);
      if (!Number.isFinite(hourReading) || hourReading < 0)
        throw new Error("Invalid hour reading");
      if (!Number.isFinite(liters) || liters < 0)
        throw new Error("Invalid liters value");
      if (!Number.isFinite(pricePerLiter) || pricePerLiter < 0)
        throw new Error("Invalid price per liter");

      const fuelType = parseFuelType(raw["Fuel Type"] ?? "");
      const isTankFull = parseBool(raw["Tank Full"] ?? "");

      parsed.push({
        row: rowNumber,
        generatorCode: code,
        generatorId,
        date,
        time,
        hourReading,
        liters,
        pricePerLiter,
        fuelType,
        isTankFull,
      });
    } catch (e) {
      errors.push({
        row: rowNumber,
        message: e instanceof Error ? e.message : "Invalid row",
      });
    }
  });

  return { parsed, errors };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const mode = (form.get("mode") as string) || "preview";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "The CSV file is empty" }, { status: 400 });
  }

  const { parsed, errors } = await process(rows);

  if (mode === "preview") {
    return NextResponse.json({
      total: rows.length,
      valid: parsed.length,
      errors,
      preview: parsed.slice(0, 50).map((p) => ({
        row: p.row,
        generatorCode: p.generatorCode,
        date: p.date.toISOString().slice(0, 10),
        time: p.time,
        hourReading: p.hourReading,
        liters: p.liters,
        pricePerLiter: p.pricePerLiter,
        fuelType: p.fuelType,
        isTankFull: p.isTankFull,
      })),
    });
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Fix the row errors before importing", errors },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(
    parsed.map((p) =>
      prisma.fuelLog.create({
        data: {
          generatorId: p.generatorId,
          date: p.date,
          time: p.time,
          hourReading: p.hourReading,
          liters: p.liters,
          pricePerLiter: p.pricePerLiter,
          fuelType: p.fuelType,
          isTankFull: p.isTankFull,
          cost: p.liters * p.pricePerLiter,
        },
      })
    )
  );

  const affected = Array.from(new Set(parsed.map((p) => p.generatorId)));
  for (const id of affected) {
    await recomputeGeneratorConsumption(id);
  }

  return NextResponse.json({ imported: created.length, generators: affected.length });
}