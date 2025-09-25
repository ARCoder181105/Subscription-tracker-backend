import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./db/connectDB.js";
import morgan from "morgan";
import session from "express-session";
import passport from "./utils/passport.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import "./utils/cronJob.js"

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ---------- Middlewares ----------
app.use(
  cors({
    origin: [
      "http://localhost:3000", // local frontend
      `${process.env.FRONTEND_URL}`, // deployed frontend
    ],
    credentials: true, // allow cookies
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Session (needed for Passport, but we use JWT for auth state) ----------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === "production", // true in Render (HTTPS)
      sameSite: "none", // required for cross-site cookies
    },
  })
);

// ---------- Passport ----------
app.use(passport.initialize());
app.use(passport.session());

// ---------- Routes ----------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);

// ---------- Start Server after DB ----------
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (${NODE_ENV} mode)`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err.message);
  });
