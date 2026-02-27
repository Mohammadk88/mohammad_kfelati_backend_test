import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyToken, JwtPayload } from "../utils/jwt";

export type AuthedRequest = Request & { user?: JwtPayload };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing or invalid token" });
  }

  try {
    const token = header.slice("Bearer ".length);
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Missing or invalid token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: "Missing or invalid token" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: "Forbidden" });
    return next();
  };
}