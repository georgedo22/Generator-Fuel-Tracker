import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const generatorSchema = z.object({
  code: z.string().trim().min(1, "Generator number is required"),
  location: z.string().trim().min(1, "Location is required"),
  imageUrl: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const fuelLogSchema = z.object({
  generatorId: z.string().min(1, "Generator is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  hourReading: z.coerce.number().min(0, "Hour reading must be >= 0"),
  liters: z.coerce.number().min(0, "Liters must be >= 0"),
  pricePerLiter: z.coerce.number().min(0, "Price per liter must be >= 0"),
  fuelType: z.enum(["PETROL", "DIESEL", "KEROSENE"]),
  isTankFull: z.coerce.boolean(),
});

export const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "OPERATOR"]),
});

export type GeneratorInput = z.infer<typeof generatorSchema>;
export type FuelLogInput = z.infer<typeof fuelLogSchema>;
export type UserInput = z.infer<typeof userSchema>;