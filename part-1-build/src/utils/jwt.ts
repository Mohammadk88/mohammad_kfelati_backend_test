import jwt, { SignOptions } from "jsonwebtoken";
import { Role } from "@prisma/client";

export type JwtPayload = { sub: string; role: Role };

export function signToken(payload: JwtPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };

  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");

  return jwt.verify(token, secret) as JwtPayload;
}