import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const isHttp = err instanceof HttpError;

  const status = isHttp ? err.status : 500;
  const message = isHttp ? err.message : "Internal server error";

  if (!isHttp) {
    console.error("[Unhandled Error]", err);
  }

  return res.status(status).json({ success: false, error: message });
}