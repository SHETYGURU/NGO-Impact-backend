import { Router } from "express"
import multer from "multer"
import fs from "fs"
import csv from "csv-parser"
import prisma from "../prisma.js"
import { authRequired, adminOnly } from "../middleware/auth.js"
import { Queue } from "bullmq"
import IORedis from "ioredis"

const router = Router()

/* ------------------ MULTER (CSV ONLY) ------------------ */
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    if (
      file.mimetype !== "text/csv" &&
      !file.originalname.endsWith(".csv")
    ) {
      cb(new Error("Only CSV files are allowed"))
    } else {
      cb(null, true)
    }
  }
})

/* ------------------ REDIS / QUEUE ------------------ */
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})
const queue = new Queue("csv-jobs", { connection: redis })

/* ------------------ CSV HEADER VALIDATION ------------------ */
const REQUIRED_HEADERS = [
  "ngoId",
  "month",
  "peopleHelped",
  "eventsConducted",
  "fundsUtilized",
]

function validateCSVHeaders(filePath) {
  return new Promise((resolve, reject) => {
    let checked = false

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", headers => {
        checked = true
        const missing = REQUIRED_HEADERS.filter(
          h => !headers.includes(h)
        )

        if (missing.length) {
          reject(
            new Error(
              `Invalid CSV headers. Missing: ${missing.join(", ")}`
            )
          )
        }
      })
      .on("data", () => {})
      .on("end", () => {
        if (!checked) {
          reject(new Error("Empty or invalid CSV file"))
        }
        resolve()
      })
      .on("error", () =>
        reject(new Error("Failed to parse CSV file"))
      )
  })
}

/* ------------------ ROUTE ------------------ */
router.post(
  "/upload",
  authRequired,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "CSV file required",
        })
      }

      // ✅ Validate CSV BEFORE queueing
      await validateCSVHeaders(req.file.path)

      // ✅ Create job
      const job = await prisma.job.create({
        data: {
          status: "PENDING",
          totalRows: 0,
          processedRows: 0,
          failedRows: 0,
        },
      })

      // ✅ Queue job
      await queue.add("process-csv", {
        jobId: job.id,
        filePath: req.file.path,
      })

      res.json({ jobId: job.id })
    } catch (err) {
      // 🧹 Cleanup invalid file
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {})
      }

      res.status(400).json({
        message: err.message,
      })
    }
  }
)

export default router
 