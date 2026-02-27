import { z } from "zod";
import { Role } from "@prisma/client";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});