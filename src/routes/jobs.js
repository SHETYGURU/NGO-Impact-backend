import { Router } from "express"
import prisma from "../prisma.js"
import { authRequired, adminOnly } from "../middleware/auth.js"

const router = Router()

router.get(
  "/:id",
  authRequired,
  adminOnly,
  async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
    })

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      })
    }

    res.json(job)
  }
)

export default router
