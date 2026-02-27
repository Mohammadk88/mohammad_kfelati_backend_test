import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { list, getById, create, cancel } from "../controllers/appointments.controller";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  appointmentIdSchema,
} from "../validators/appointments.schemas";
import { HttpError } from "../middlewares/error.middleware";

const router = Router();

/* GET /appointments */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const validated = listAppointmentsQuerySchema.parse(req.query);

    res.locals.validatedQuery = validated;
    await list(req as any, res);
  } catch (e: any) {
    if (e?.issues) return next(new HttpError(400, e.issues[0]?.message ?? "Invalid query parameters"));
    next(e);
  }
});

/* POST /appointments */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    req.body = createAppointmentSchema.parse(req.body);
    await create(req as any, res);
  } catch (e: any) {
    if (e?.issues) return next(new HttpError(400, e.issues[0]?.message ?? "Invalid request body"));
    next(e);
  }
});

/* GET /appointments/:id */
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    appointmentIdSchema.parse(req.params);
    await getById(req as any, res);
  } catch (e: any) {
    if (e?.issues) return next(new HttpError(400, e.issues[0]?.message ?? "Invalid appointment ID"));
    next(e);
  }
});

/* PATCH /appointments/:id/cancel */
router.patch("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    appointmentIdSchema.parse(req.params);
    await cancel(req as any, res);
  } catch (e: any) {
    if (e?.issues) return next(new HttpError(400, e.issues[0]?.message ?? "Invalid appointment ID"));
    next(e);
  }
});

export default router;