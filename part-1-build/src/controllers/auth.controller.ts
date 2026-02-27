import { Request, Response } from "express";
import { ok } from "../utils/response";
import { registerUser, loginUser } from "../services/auth.service";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  return ok(res, user, 201);
}

export async function login(req: Request, res: Response) {
  const data = await loginUser(req.body);
  return ok(res, data, 200);
}