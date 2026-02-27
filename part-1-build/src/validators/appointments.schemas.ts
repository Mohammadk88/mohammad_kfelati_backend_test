import { z } from "zod";

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid("doctorId must be a valid UUID"),
  dateTime: z
    .string()
    .datetime("dateTime must be YYYY-MM-DD HH:mm:ss")
    .refine(
      (val) => new Date(val) > new Date(),
      "dateTime must be in the future"
    ),
  duration: z.number().int().positive("duration must be a positive integer").optional(),
  notes: z.string().max(2000).optional(),
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["SCHEDULED", "CANCELLED"]).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD format")
    .optional(),
});

export const appointmentIdSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});