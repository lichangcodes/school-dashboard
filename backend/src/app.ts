import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";

// import securityMiddleware from "./middleware/security.js";
import { requireAuth } from "./middleware/auth.js";
import { auth } from "./lib/auth.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React app URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // allow cookies
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// app.use(securityMiddleware);

app.use("/api/subjects", requireAuth, subjectsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/classes", requireAuth, classesRouter);
app.use("/api/departments", requireAuth, departmentsRouter);
app.use("/api/stats", requireAuth, statsRouter);
app.use("/api/enrollments", requireAuth, enrollmentsRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

export default app;
