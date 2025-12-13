import { Worker } from "bullmq"
import IORedis from "ioredis"
import fs from "fs"
import csv from "csv-parser"
import prisma from "../prisma.js"

const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

/* ------------------ VALIDATION HELPERS ------------------ */
function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function isNonNegativeInt(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0
}

/* ------------------ WORKER ------------------ */
const worker = new Worker(
  "csv-jobs",
  async job => {
    const { jobId, filePath } = job.data

    let totalRows = 0
    let processedRows = 0
    let failedRows = 0

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    })

    const stream = fs.createReadStream(filePath).pipe(csv())

    for await (const row of stream) {
      totalRows++

      const {
        ngoId,
        month,
        peopleHelped,
        eventsConducted,
        fundsUtilized,
      } = row

      // ❌ Row-level validation
      if (
        !ngoId ||
        !isValidMonth(month) ||
        !isNonNegativeInt(peopleHelped) ||
        !isNonNegativeInt(eventsConducted) ||
        !isNonNegativeInt(fundsUtilized)
      ) {
        failedRows++

        await prisma.jobFailure.create({
          data: {
            jobId,
            rowNumber: totalRows,
            error: "Invalid row data",
          },
        })
        continue
      }

      try {
        await prisma.report.upsert({
          where: {
            ngoId_month: { ngoId, month },
          },
          update: {
            peopleHelped: Number(peopleHelped),
            eventsConducted: Number(eventsConducted),
            fundsUtilized: Number(fundsUtilized),
          },
          create: {
            ngoId,
            month,
            peopleHelped: Number(peopleHelped),
            eventsConducted: Number(eventsConducted),
            fundsUtilized: Number(fundsUtilized),
          },
        })

        processedRows++
      } catch (err) {
        failedRows++

        await prisma.jobFailure.create({
          data: {
            jobId,
            rowNumber: totalRows,
            error: err.message,
          },
        })
      }

      // 🔁 Update progress every 10 rows (IMPORTANT)
      if (totalRows % 10 === 0) {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            totalRows,
            processedRows,
            failedRows,
          },
        })
      }
    }

    // ✅ Final job update
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        totalRows,
        processedRows,
        failedRows,
      },
    })

    // 🧹 Cleanup file
    fs.unlink(filePath, () => {})
  },
  { connection: redis }
)

/* ------------------ LOGGING ------------------ */
worker.on("completed", job => {
  console.log(`CSV Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
  console.error(`CSV Job ${job?.id} failed`, err)
})

export default worker
