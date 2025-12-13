import { Router } from "express"
import prisma from "../prisma.js"
import { authRequired, adminOnly } from "../middleware/auth.js"

const router = Router()

// GET /dashboard?month=YYYY-MM
router.get("/", authRequired, adminOnly, async (req, res) => {
  const { month } = req.query

  if (!month) {
    return res.status(400).json({ message: "month query param is required" })
  }

  try {
    const stats = await prisma.report.aggregate({
      where: { month },
      _sum: {
        peopleHelped: true,
        eventsConducted: true,
        fundsUtilized: true
      },
      _count: {
        ngoId: true
      }
    })

    res.json({
      month,
      totalNGOsReporting: stats._count.ngoId,
      totalPeopleHelped: stats._sum.peopleHelped || 0,
      totalEventsConducted: stats._sum.eventsConducted || 0,
      totalFundsUtilized: stats._sum.fundsUtilized || 0
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to fetch dashboard data" })
  }
})

export default router
