import { Response } from "express";
import { AuthedRequest } from "../middlewares/auth.middleware";
import {
  listAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment,
} from "../services/appointments.service";
import { ok } from "../utils/response";
import { HttpError } from "../middlewares/error.middleware";

export async function list(req: AuthedRequest, res: Response) {
  if (!req.user) throw new HttpError(401, "Missing or invalid token");

  const { status, date } = res.locals.validatedQuery || {};
  const appointments = await listAppointments(req.user.sub, req.user.role, {
    status,
    date,
  });

  return ok(res, appointments);
}

export async function getById(req: AuthedRequest, res: Response) {
  if (!req.user) throw new HttpError(401, "Missing or invalid token");

  const appointment = await getAppointmentById(
    req.params.id as string,
    req.user.sub,
    req.user.role
  );

  return ok(res, appointment);
}

export async function create(req: AuthedRequest, res: Response) {
  if (!req.user) throw new HttpError(401, "Missing or invalid token");

  if (req.user.role !== "PATIENT") {
    throw new HttpError(403, "Only patients can create appointments");
  }

  const appointment = await createAppointment(req.user.sub, req.body);
  return ok(res, appointment, 201);
}

export async function cancel(req: AuthedRequest, res: Response) {
  if (!req.user) throw new HttpError(401, "Missing or invalid token");

  const appointment = await cancelAppointment(
    req.params.id as string,
    req.user.sub,
    req.user.role
  );

  return ok(res, appointment);
}
