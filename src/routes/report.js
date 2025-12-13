import { Router } from "express"
import prisma from "../prisma.js"
import { authRequired, adminOnly } from "../middleware/auth.js"

const router = Router()

// POST /report
router.post("/", authRequired, adminOnly, async (req, res) => {
const {
  ngoId,
  month,
  peopleHelped = 0,
  eventsConducted = 0,
  fundsUtilized = 0
} = req.body

  // Basic validation
  if (!ngoId || !month) {
    return res.status(400).json({ message: "ngoId and month are required" })
  }

  try {
    const report = await prisma.report.upsert({
      where: {
        ngoId_month: {
          ngoId,
          month
        }
      },
      update: {
  peopleHelped: Number(peopleHelped),
  eventsConducted: Number(eventsConducted),
  fundsUtilized: Number(fundsUtilized)
},
create: {
  ngoId,
  month,
  peopleHelped: Number(peopleHelped),
  eventsConducted: Number(eventsConducted),
  fundsUtilized: Number(fundsUtilized)
}

    })

    res.json({ message: "Report saved", report })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to save report" })
  }
})

export default router
