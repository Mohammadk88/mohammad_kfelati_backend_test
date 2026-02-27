import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { authMiddleware } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();

// Input validation schemas
const createRecordSchema = z.object({
  patientName: z.string().min(1, "Patient name is required").max(200),
  diagnosis: z.string().min(1, "Diagnosis is required").max(1000),
  notes: z.string().max(5000).optional(),
});

/**
 * GET /records
 * List all medical records
 */
router.get("/", authMiddleware, authorize("ADMIN", "DOCTOR", "STAFF"), async (req: Request, res: Response) => {
  try {
    const records = await prisma.record.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    console.error("List records error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /records/search
 * Search records by patient name
 * Using raw query for case-insensitive search
 */
router.get("/search", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        error: "Search parameter 'name' is required",
      });
    }

    // Use Prisma's safe query API instead of raw SQL to prevent SQL injection
    const results = await prisma.record.findMany({
      where: {
        patientName: {
          contains: name,
          mode: "insensitive",
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Search records error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /records/:id
 * Get a specific record by ID
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const record = await prisma.record.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "Record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error("Get record error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /records
 * Create a new medical record
 */
router.post("/", authMiddleware, authorize("ADMIN", "DOCTOR"), async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = createRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues.map((i) => i.message),
      });
    }

    const { patientName, diagnosis, notes } = parsed.data;

    const record = await prisma.record.create({
      data: {
        patientName,
        diagnosis,
        notes,
        createdById: req.user!.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error("Create record error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
