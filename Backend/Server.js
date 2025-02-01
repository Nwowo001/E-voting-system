import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
// Import Routes
import candidateRoutes from "./routes/candidateRoutes.js";
import electionRoutes from "./routes/electionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import statsRoutes from "./routes/statsRoute.js";
import votersRoutes from "./routes/votersRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

// Session Middleware should come after app is initialized
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000,
    },
  })
);

if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Configure CORS before any routes
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Access-Control-Allow-Origin"],
  })
);

// Enable pre-flight requests for all routes
app.options("*", cors());

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("vote_cast", async (data) => {
    try {
      const result = await recordVote(data);
      io.emit("vote_updated", result);
    } catch (error) {
      socket.emit("vote_error", error.message);
    }
  });
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
  req.io = io;
  next();
});
// Routes
app.use("/api/candidates", candidateRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/voters", votersRoutes);
app.use("/api/auth", adminRoutes);
app.use("/api", votersRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Default Route
app.get("/", (req, res) => {
  res.send("E-voting backend is running.");
});
// In server.js, with your other routes
app.post("/api/auth/logout", (req, res) => {
  // Clear the session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    // Clear the cookie
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});
// Start Server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export { io };
// Error Handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason, promise);
});
