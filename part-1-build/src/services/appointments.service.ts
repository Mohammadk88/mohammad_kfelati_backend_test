import { prisma } from "../prisma";
import { Role, AppointmentStatus } from "@prisma/client";
import { HttpError } from "../middlewares/error.middleware";

// patient/doctor
const userBasicSelect = { id: true, name: true, email: true } as const;

const appointmentInclude = {
  patient: { select: userBasicSelect },
  doctor: { select: userBasicSelect },
} as const;

// Types
export interface ListAppointmentsFilter {
  status?: AppointmentStatus;
  date?: string; // YYYY-MM-DD
}

// LIST
export async function listAppointments(
  userId: string,
  role: Role,
  filter: ListAppointmentsFilter = {}
) {
  const where: Record<string, unknown> = {};

  if (role === "PATIENT") where.patientId = userId;
  else if (role === "DOCTOR") where.doctorId = userId;

  if (filter.status) where.status = filter.status;

  if (filter.date) {
    const start = new Date(filter.date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.dateTime = { gte: start, lt: end };
  }

  return prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { dateTime: "asc" },
  });
}

//GET By ID
export async function getAppointmentById(
  appointmentId: string,
  userId: string,
  role: Role
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });

  if (!appointment) throw new HttpError(404, "Appointment not found");
  // Access by Role
  if (
    role === "PATIENT" && appointment.patientId !== userId ||
    role === "DOCTOR" && appointment.doctorId !== userId
  ) {
    throw new HttpError(403, "Forbidden");
  }

  return appointment;
}

//Create Appointment
export async function createAppointment(
  patientId: string,
  data: { doctorId: string; dateTime: string; duration?: number; notes?: string }
) {
  const doctor = await prisma.user.findUnique({
    where: { id: data.doctorId },
  });

  if (!doctor || doctor.role !== "DOCTOR") {
    throw new HttpError(404, "Doctor not found");
  }

  const start = new Date(data.dateTime);
  const durationMin = data.duration ?? 30;
  const end = new Date(start.getTime() + durationMin * 60_000);

  // Check conflict
  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: data.doctorId,
      status: "SCHEDULED",
      dateTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (conflict) {
    throw new HttpError(409, "Doctor has a conflicting appointment");
  }

  return prisma.appointment.create({
    data: {
      patientId,
      doctorId: data.doctorId,
      dateTime: start,
      endTime: end,
      duration: durationMin,
      notes: data.notes,
      status: "SCHEDULED",
    },
    include: appointmentInclude,
  });
}

//Cancel Appointment
export async function cancelAppointment(
  appointmentId: string,
  userId: string,
  role: Role
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) throw new HttpError(404, "Appointment not found");

  // Access by Role
  if (
    role === "PATIENT" && appointment.patientId !== userId ||
    role === "DOCTOR" && appointment.doctorId !== userId
  ) {
    throw new HttpError(403, "Forbidden");
  }

  if (appointment.status === "CANCELLED") {
    throw new HttpError(400, "Appointment is already cancelled");
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
    include: appointmentInclude,
  });
}
