import { Router } from "express";
import { register, login } from "../controllers/auth.controller";
import { registerSchema, loginSchema } from "../validators/auth.schemas";
import { HttpError } from "../middlewares/error.middleware";

const router = Router();
// auth/register
router.post("/register", async (req, res, next) => {
  try {
    req.body = registerSchema.parse(req.body);
    await register(req, res);
  } catch (e: any) {
    if (e?.issues) return next(new HttpError(400, e.issues[0]?.message ?? "Invalid request body"));
    next(e);
  }
});
// auth/login
router.post("/login", async (req, res, next) => {
  try {
    req.body = loginSchema.parse(req.body);
    await login(req, res);
  } catch (e: any) {
    if (e?.issues) return next(new HttpError(400, e.issues[0]?.message ?? "Invalid request body"));
    next(e);
  }
});

export default router;