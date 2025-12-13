import express from "express"
import cors from "cors"
import authRoutes from "./routes/auth.js"
import reportRoutes from "./routes/report.js"
import dashboardRoutes from "./routes/dashboard.js"
import uploadRoutes from "./routes/upload.js"
import jobStatusRoutes from "./routes/jobStatus.js"
import jobRoutes from "./routes/jobs.js"


const app = express()
app.use(cors())
app.use(express.json())

app.use("/auth", authRoutes)
app.use("/report", reportRoutes)
app.use("/reports", uploadRoutes)
app.use("/dashboard", dashboardRoutes)
app.use("/job-status", jobStatusRoutes)
app.use("/jobs", jobRoutes)



app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000")
})
