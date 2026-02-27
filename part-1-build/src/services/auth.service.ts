import bcrypt from "bcrypt";
import { prisma } from "../prisma";
import { Role } from "@prisma/client";
import { HttpError } from "../middlewares/error.middleware";
import { signToken } from "../utils/jwt";

export async function registerUser(input: { email: string; password: string; name: string; role: Role }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "Email already registered");
  const hash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: { email: input.email, password: hash, name: input.name, role: input.role },
    select: { id: true, email: true, name: true, role: true },
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new HttpError(401, "Invalid email or password");
  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw new HttpError(401, "Invalid email or password");

  const token = signToken({ sub: user.id, role: user.role });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}