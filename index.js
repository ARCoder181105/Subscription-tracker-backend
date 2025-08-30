import dotenv from "dotenv"
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './db/connectDB.js';
import morgan from 'morgan'
import session from "express-session";
import passport from "./utils/passport.js"
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'



const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: "http://localhost:3000",  // your frontend dev server
  credentials: true                 // allow cookies
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());


// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
// app.use('/api/v1/admin',adminRoutes);




// Start server after DB connects
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Error connecting to DB:`, err.message);
  });
