export type DashboardData = {
  kpis: {
    generatorCount: number;
    logCount: number;
    totalLiters: number;
    totalCost: number;
    avgConsumption: number | null;
  };
  monthlySeries: {
    month: string;
    liters: number;
    cost: number;
    avgConsumption: number;
  }[];
  generatorSummary: {
    generatorId: string;
    code: string;
    liters: number;
    cost: number;
    avgConsumption: number | null;
  }[];
  recentLogs: {
    id: string;
    generatorCode: string;
    date: string;
    time: string;
    liters: number;
    fuelType: string;
    isTankFull: boolean;
    consumptionPerHour: number | null;
  }[];
};

export type GeneratorDto = {
  id: string;
  code: string;
  location: string;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { fuelLogs: number };
};

export type FuelLogDto = {
  id: string;
  generatorId: string;
  date: string;
  time: string;
  hourReading: number;
  liters: number;
  pricePerLiter: number;
  fuelType: "PETROL" | "DIESEL" | "KEROSENE";
  isTankFull: boolean;
  hoursWorked: number | null;
  consumptionPerHour: number | null;
  cost: number;
  createdAt: string;
  generator?: { code: string; location: string };
};

export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  createdAt: string;
};

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}