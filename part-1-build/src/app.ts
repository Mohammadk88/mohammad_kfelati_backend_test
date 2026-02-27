import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import appointmentsRoutes from "./routes/appointments.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/appointments", appointmentsRoutes);

app.use(errorMiddleware);