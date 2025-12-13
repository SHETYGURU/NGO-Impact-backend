import { Router } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import prisma from "../prisma.js"
import { authRequired } from "../middleware/auth.js"

const router = Router()

// Seed admin (run once)
router.post("/seed-admin", async (req, res) => {
  const passwordHash = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { email: "admin@ngo.com" },
    update: {},
    create: {
      email: "admin@ngo.com",
      password: passwordHash,
      role: "ADMIN"
    }
  })

  res.json({ message: "Admin created" })
})

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ message: "Invalid credentials" })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ message: "Invalid credentials" })

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  )

  res.json({ token })
})

router.get("/me", authRequired, async (req, res) => {
  res.json({
    userId: req.user.userId,
    role: req.user.role,
  })
})

export default router
