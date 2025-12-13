import { Router } from "express"
import prisma from "../prisma.js"
import { authRequired, adminOnly } from "../middleware/auth.js"

const router = Router()

// GET /job-status/:jobId
router.get("/:jobId", authRequired, adminOnly, async (req, res) => {
  const { jobId } = req.params

  const job = await prisma.job.findUnique({
    where: { id: jobId }
  })

  if (!job) {
    return res.status(404).json({ message: "Job not found" })
  }

  res.json({
    jobId: job.id,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    failedRows: job.failedRows
  })
})

export default router
