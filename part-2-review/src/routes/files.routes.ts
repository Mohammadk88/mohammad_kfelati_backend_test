import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /files/:filename
 * Download a file from the uploads directory
 */
router.get("/:filename", authMiddleware, (req: Request, res: Response) => {
  try {
    const uploadsDir = path.resolve(__dirname, "..", "uploads");
    const filename = path.basename(req.params.filename); // Strip directory traversal
    const filePath = path.resolve(uploadsDir, filename);

    // Verify the resolved path is still within the uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    return res.sendFile(filePath);
  } catch (error: any) {
    console.error("File download error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
